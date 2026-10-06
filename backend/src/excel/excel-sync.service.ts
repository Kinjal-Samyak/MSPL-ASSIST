import type {
  ExcelSyncConfigDto,
  ExcelSyncSource,
  MasterDeploymentSyncRowDto,
  ParsedExcelRowDto,
  RowSyncErrorDto,
  SyncExecutionResultDto,
  SyncSummaryDto,
  SyncPersistenceAction,
} from "../dto/excel-sync.dto";
import type {
  ExcelReader,
  RowMapper,
  SyncLogger,
  SyncRepository,
  SyncService,
  ValidationService,
} from "../interfaces/excel-sync.interface";
import { ExcelReaderService } from "./excel-reader.service";
import { ExcelSyncLogger } from "./excel-sync.logger";
import { ExcelSyncRowMapper } from "./excel-sync.mapper";
import { ExcelSyncRepository } from "./excel-sync.repository";
import { ExcelSyncValidationService } from "./excel-sync.validator";
import { riderAssignmentService } from "../services/rider-assignment.service";
import { normalizeAssetKey } from "./excel-sync.normalization";

interface SyncCounters {
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  blankRows: number;
  validationErrors: number;
}

const MAX_DETAILED_ERROR_LOGS = 100;

export class ExcelSynchronizationService implements SyncService {
  constructor(
    private readonly reader: ExcelReader = new ExcelReaderService(),
    private readonly mapper: RowMapper = new ExcelSyncRowMapper(),
    private readonly validator: ValidationService = new ExcelSyncValidationService(),
    private readonly repository: SyncRepository = new ExcelSyncRepository(),
    private readonly syncLogger: SyncLogger = new ExcelSyncLogger()
  ) {}

  async syncMasterDeployment(config: ExcelSyncConfigDto): Promise<SyncExecutionResultDto> {
    const source: ExcelSyncSource = "MASTER_DEPLOYMENT";
    const mapper = this.mapper instanceof ExcelSyncRowMapper
      ? new ExcelSyncRowMapper({ masterColumnMapping: config.masterDeployment.columnMapping })
      : this.mapper;
    const rows = this.reader.readRows(
      config.masterDeployment.filePath,
      config.masterDeployment.sheetName
    );
    const start = Date.now();
    const counters: SyncCounters = {
      rowsRead: rows.length,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      blankRows: 0,
      validationErrors: 0,
    };
    const errors: RowSyncErrorDto[] = [];
    const normalized = this.normalizeMasterRows(rows, mapper, counters);
    counters.rowsSkipped += normalized.errors.length;
    errors.push(...normalized.errors);

    await this.persistRows(
      source,
      normalized.rows,
      (row) => this.repository.upsertMasterDeploymentRow(row),
      counters,
      errors
    );

    if (
      normalized.rows.length > 0 &&
      counters.rowsFailed === 0 &&
      typeof this.repository.pruneMasterDeploymentRows === "function"
    ) {
      await this.repository.pruneMasterDeploymentRows(normalized.rows.map((row) => String(row.rowNumber)));
    }

    const summary = this.toSummary(counters, start);
    this.logSyncResult(source, summary, counters, errors.length);
    return {
      source,
      summary,
      errors,
    };
  }

  async syncInventoryNspl(config: ExcelSyncConfigDto): Promise<SyncExecutionResultDto> {
    const source: ExcelSyncSource = "INVENTORY_NSPL";
    const mapper = this.mapper instanceof ExcelSyncRowMapper
      ? new ExcelSyncRowMapper({ inventoryColumnMapping: config.inventoryNspl.columnMapping })
      : this.mapper;
    const rows = this.reader.readRows(config.inventoryNspl.filePath, config.inventoryNspl.sheetName);
    const start = Date.now();
    const counters: SyncCounters = {
      rowsRead: rows.length,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      blankRows: 0,
      validationErrors: 0,
    };
    const errors: RowSyncErrorDto[] = [];
    const dedupe = new Set<string>();
    const importedInventoryKeys = new Set<string>();

    for (const row of rows) {
      if (this.isBlankRow(row)) {
        counters.rowsSkipped += 1;
        counters.blankRows += 1;
        continue;
      }
      try {
        const mapped = mapper.mapInventoryNsplRow(row);
        const validation = this.validator.validateInventoryNsplRow(mapped);
        if (!validation.value) {
          counters.rowsSkipped += 1;
          counters.validationErrors += validation.issues.length;
          const reason = this.formatValidationIssues(validation.issues);
          errors.push({ source, rowNumber: row.rowNumber, reason });
          this.syncLogger.error({ scope: "excel-sync", source, rowNumber: row.rowNumber, reason });
          continue;
        }
        const validated = validation.value;
        const motorNo = normalizeAssetKey(validated.motorNumber);
        const rowKey = motorNo || `INVALID-MOTOR:${validated.mvTrackNumber.toUpperCase()}`;
        if (dedupe.has(rowKey)) {
          counters.rowsSkipped += 1;
          const duplicateError = {
            source,
            rowNumber: row.rowNumber,
            reason: "Duplicate inventory row detected.",
          };
          errors.push(duplicateError);
          this.syncLogger.error({
            scope: "excel-sync",
            ...duplicateError,
          });
          continue;
        }
        dedupe.add(rowKey);
        importedInventoryKeys.add(rowKey);

        await this.persistRow(
          source,
          validated,
          (inventoryRow) => this.repository.upsertInventoryNsplRow(inventoryRow),
          counters,
          errors
        );
      } catch (error) {
        this.recordFailure(source, row.rowNumber, error, counters, errors);
      }
    }

    const reconciliationSafe =
      importedInventoryKeys.size > 0 &&
      counters.rowsFailed === 0 &&
      counters.validationErrors === 0;
    if (reconciliationSafe && typeof this.repository.pruneInventoryNsplRows === "function") {
      await this.repository.pruneInventoryNsplRows(Array.from(importedInventoryKeys));
    } else if (typeof this.repository.pruneInventoryNsplRows === "function") {
      this.syncLogger.info({
        scope: "excel-sync",
        source,
        event: "Inventory Reconciliation Skipped",
        reason:
          importedInventoryKeys.size === 0
            ? "No valid inventory rows were imported."
            : "The inventory import contained validation or persistence failures.",
        validInventoryKeys: importedInventoryKeys.size,
        validationErrors: counters.validationErrors,
        persistenceFailures: counters.rowsFailed,
      });
    }

    const summary = this.toSummary(counters, start);
    this.logSyncResult(source, summary, counters, errors.length);
    return {
      source,
      summary,
      errors,
    };
  }

  private normalizeMasterRows(
    rows: ParsedExcelRowDto[],
    mapper: RowMapper,
    counters: SyncCounters
  ): { rows: MasterDeploymentSyncRowDto[]; errors: RowSyncErrorDto[] } {
    const candidates: MasterDeploymentSyncRowDto[] = [];
    const errors: RowSyncErrorDto[] = [];

    for (const row of rows) {
      if (this.isBlankRow(row)) {
        counters.blankRows += 1;
        counters.rowsSkipped += 1;
        continue;
      }
      try {
        const mapped = mapper.mapMasterDeploymentRow(row);
        if (this.isBlankMappedMasterRow(mapped)) {
          counters.blankRows += 1;
          counters.rowsSkipped += 1;
          continue;
        }
        const validation = this.validator.validateMasterDeploymentRow(mapped);
        if (!validation.value) {
          counters.validationErrors += validation.issues.length;
          errors.push({
            source: "MASTER_DEPLOYMENT",
            rowNumber: row.rowNumber,
            reason: this.formatValidationIssues(validation.issues),
          });
          continue;
        }
        const validated = validation.value;
        candidates.push(validated);
      } catch (error) {
        errors.push({
          source: "MASTER_DEPLOYMENT",
          rowNumber: row.rowNumber,
          reason: error instanceof Error ? error.message : "Invalid master deployment row.",
        });
      }
    }

    for (const rowError of errors.slice(0, MAX_DETAILED_ERROR_LOGS)) {
      this.syncLogger.error({
        scope: "excel-sync",
        source: "MASTER_DEPLOYMENT",
        rowNumber: rowError.rowNumber,
        reason: rowError.reason,
      });
    }
    if (errors.length > MAX_DETAILED_ERROR_LOGS) {
      this.syncLogger.info({
        scope: "excel-sync",
        source: "MASTER_DEPLOYMENT",
        event: "Detailed Validation Errors Suppressed",
        loggedErrors: MAX_DETAILED_ERROR_LOGS,
        suppressedErrors: errors.length - MAX_DETAILED_ERROR_LOGS,
      });
    }

    const latestKeys = this.selectLatestDeploymentKeys(candidates);
    return {
      rows: candidates.map((row) => ({
        ...row,
        isLatestForRider: latestKeys.has(this.masterDedupKey(row)),
      })),
      errors,
    };
  }

  private selectLatestDeploymentKeys(rows: MasterDeploymentSyncRowDto[]): Set<string> {
    const byRider = new Map<string, MasterDeploymentSyncRowDto[]>();

    for (const row of rows) {
      const existing = byRider.get(row.phone) ?? [];
      existing.push(row);
      byRider.set(row.phone, existing);
    }

    const selected = new Set<string>();
    for (const riderRows of byRider.values()) {
      const chosen = riderAssignmentService.getCurrentRentalPlan(riderRows);
      if (chosen) {
        selected.add(this.masterDedupKey(chosen));
      }
    }

    return selected;
  }

  private masterDedupKey(row: MasterDeploymentSyncRowDto): string {
    return `${row.phone.toUpperCase()}|${row.mvTrackNumber.toUpperCase()}|${row.vehicle.toUpperCase()}|${row.deploymentDate}`;
  }

  private incrementCounters(counters: SyncCounters, action: "inserted" | "updated" | "unchanged"): void {
    if (action === "inserted") {
      counters.rowsInserted += 1;
      return;
    }

    if (action === "updated") {
      counters.rowsUpdated += 1;
      return;
    }

    counters.rowsSkipped += 1;
  }

  private toSummary(counters: SyncCounters, start: number): SyncSummaryDto {
    return {
      rowsRead: counters.rowsRead,
      rowsInserted: counters.rowsInserted,
      rowsUpdated: counters.rowsUpdated,
      rowsSkipped: counters.rowsSkipped,
      rowsFailed: counters.rowsFailed,
      executionTimeMs: Date.now() - start,
    };
  }

  private logSyncResult(
    source: ExcelSyncSource,
    summary: SyncSummaryDto,
    counters: SyncCounters,
    errorCount: number
  ): void {
    this.syncLogger.info({
      scope: "excel-sync",
      source,
      rowsRead: summary.rowsRead,
      rowsImported: summary.rowsInserted,
      rowsInserted: summary.rowsInserted,
      rowsUpdated: summary.rowsUpdated,
      rowsSkipped: summary.rowsSkipped,
      rowsFailed: summary.rowsFailed,
      blankRows: counters.blankRows,
      validationErrors: counters.validationErrors,
      executionTimeMs: summary.executionTimeMs,
      errors: errorCount,
    });
  }

  private isBlankRow(row: ParsedExcelRowDto): boolean {
    return Object.values(row.values).every(
      (value) => value === null || value === undefined || String(value).trim().length === 0
    );
  }

  private formatValidationIssues(issues: Array<{ column: string; reason: string }>): string {
    return issues.map((issue) => `${issue.column}: ${issue.reason}`).join("; ");
  }

  private isBlankMappedMasterRow(row: MasterDeploymentSyncRowDto): boolean {
    const importantValues = [row.rider, row.phone, row.vehicle, row.mvTrackNumber, row.plan, row.status];
    return importantValues.every((value) => {
      const normalized = String(value ?? "").trim();
      return normalized.length === 0 || /^0+(?:\.0+)?$/.test(normalized);
    });
  }

  private async persistRows<T extends { rowNumber: number }>(
    source: ExcelSyncSource,
    rows: T[],
    persist: (row: T) => Promise<SyncPersistenceAction>,
    counters: SyncCounters,
    errors: RowSyncErrorDto[]
  ): Promise<void> {
    for (const row of rows) {
      await this.persistRow(source, row, persist, counters, errors);
    }
  }

  private async persistRow<T extends { rowNumber: number }>(
    source: ExcelSyncSource,
    row: T,
    persist: (row: T) => Promise<SyncPersistenceAction>,
    counters: SyncCounters,
    errors: RowSyncErrorDto[]
  ): Promise<boolean> {
    try {
      this.incrementCounters(counters, await persist(row));
      return true;
    } catch (error) {
      this.recordFailure(source, row.rowNumber, error, counters, errors);
      return false;
    }
  }

  private recordFailure(
    source: ExcelSyncSource,
    rowNumber: number,
    error: unknown,
    counters: SyncCounters,
    errors: RowSyncErrorDto[]
  ): void {
    counters.rowsFailed += 1;
    const reason = error instanceof Error ? error.message : "Unknown row persistence failure.";
    errors.push({ source, rowNumber, reason });
    this.syncLogger.error({ scope: "excel-sync", source, rowNumber, reason });
  }
}
