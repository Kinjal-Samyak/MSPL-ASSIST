import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { OPERATIONAL_SYNC_FREQUENCIES, type OperationalSyncFrequency } from "../constants/operational-data.constants";
import type { ExcelSyncConfigDto } from "../dto/excel-sync.dto";
import type {
  BrowseOneDriveItemsResponseDto,
  OneDriveDriveDto,
  DetectMappingSuggestionsResponseDto,
  GraphAuthStatusResponseDto,
  GraphAuthUrlResponseDto,
  InventoryColumnMappingDto,
  LoadWorkbookHeadersResponseDto,
  MappingSuggestionDto,
  MasterColumnMappingDto,
  OperationalDataSettingsDto,
  OperationalFolderScanResponseDto,
  PreviewOperationalConfigurationResponseDto,
  SyncFileSystemMetadataDto,
  UpdateOperationalDataSettingsDto,
  ValidateOperationalDataResponseDto,
  ValidateWorkbookUrlsResponseDto,
  WorkbookWorksheetsResponseDto,
} from "../dto/operational-data.dto";
import { ValidationError } from "../errors";
import { CloudWorkbookService } from "../excel/cloud-workbook.service";
import { ExcelColumnMapperService } from "../excel/excel-column-mapper.service";
import { ExcelMetadataReaderService } from "../excel/excel-metadata-reader.service";
import { ExcelRelationshipPreviewService } from "../excel/excel-relationship-preview.service";
import { ExcelScannerService } from "../excel/excel-scanner.service";
import { ExcelValidatorService } from "../excel/excel-validator.service";
import { OperationalDataRepository, type OperationalDataConfigRecord } from "../repositories/operational-data.repository";
import { GraphAuthService, graphAuthService } from "./graph-auth.service";
import {
  validateGraphAuthExchangeInput,
  validateDetectMappingsInput,
  validateLoadWorksheetsInput,
  validateOperationalDataInput,
  validatePreviewConfigurationInput,
  validateSaveWizardConfigurationInput,
  validateScanFolderInput,
  validateUpdateOperationalDataInput,
  validateBrowseOneDriveItemsInput,
  validateWorkbookHeadersInput,
  validateWorkbookUrlsInput,
} from "../validators/operational-data.validator";
import { GraphFileService, graphFileService } from "./graph-file.service";
import { logger } from "../utils/logger";

function resolveWorkbook(folder: string, workbook: string): string {
  return path.resolve(path.join(folder, workbook));
}

function getLastModifiedIso(filePath: string): string {
  const stats = fs.statSync(filePath);
  return stats.mtime.toISOString();
}

function normalizeOrFallback<T extends string>(value: string, supported: readonly T[], fallback: T): T {
  const normalized = value.trim().toUpperCase() as T;
  if (supported.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeForScore(value: string): string {
  return value.toLowerCase().replace(/[_\-\s]+/g, "").replace(/[^a-z0-9]/g, "");
}

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[_\-]+/g, " ")
      .split(/\s+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const entry of a) {
    if (b.has(entry)) {
      intersection += 1;
    }
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function scoreHeaders(left: string, right: string): number {
  const normalizedLeft = normalizeForScore(left);
  const normalizedRight = normalizeForScore(right);
  if (normalizedLeft === normalizedRight) {
    return 0.99;
  }
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return 0.9;
  }
  const similarity = jaccard(tokenSet(left), tokenSet(right));
  if (similarity > 0.75) {
    return 0.82;
  }
  if (similarity > 0.5) {
    return 0.68;
  }
  return similarity * 0.5;
}

function mappingDefaults(): { master: MasterColumnMappingDto; inventory: InventoryColumnMappingDto } {
  return {
    master: {
      customerName: "Customer Name",
      phone: "Phone",
      hub: "Hub",
      vehicleNumber: "Vehicle Number",
      mvTrackNumber: "MV Track Number",
      plan: "Plan",
      rentalStatus: "Rental Status",
      deploymentDate: "Deployment Date",
      returnDate: "Return Date",
      coordinator: "Coordinator",
    },
    inventory: {
      mvTrackNumber: "MV Track Number",
      vehicleNumber: "Vehicle Number",
      model: "Model",
      modelCode: "Model Code",
      status: "Status",
      hub: "Hub",
      battery: "Battery",
      iotDevice: "IOT Device",
      vin: "VIN",
      motorNumber: "Motor Number",
      chassisNumber: "Chassis Number",
    },
  };
}

function computeStructureHash(
  masterWorksheet: string,
  inventoryWorksheet: string,
  masterHeaders: string[],
  inventoryHeaders: string[]
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        masterWorksheet,
        inventoryWorksheet,
        masterHeaders,
        inventoryHeaders,
      })
    )
    .digest("hex");
}

interface WorkbookSourceInput {
  workbookUrl?: string;
  driveId?: string;
  itemId?: string;
}

function hasSourceIdentity(input: WorkbookSourceInput): boolean {
  return (
    typeof input.driveId === "string" &&
    input.driveId.trim().length > 0 &&
    typeof input.itemId === "string" &&
    input.itemId.trim().length > 0
  );
}

function normalizeSourceIdentity(input: WorkbookSourceInput): WorkbookSourceInput {
  const workbookUrl = typeof input.workbookUrl === "string" ? input.workbookUrl.trim() : "";
  const driveId = typeof input.driveId === "string" ? input.driveId.trim() : "";
  const itemId = typeof input.itemId === "string" ? input.itemId.trim() : "";
  return {
    workbookUrl: workbookUrl.length > 0 ? workbookUrl : undefined,
    driveId: driveId.length > 0 ? driveId : undefined,
    itemId: itemId.length > 0 ? itemId : undefined,
  };
}

export interface SyncRuntimeConfiguration {
  config: ExcelSyncConfigDto;
  metadata: SyncFileSystemMetadataDto;
  schedulerMode: OperationalSyncFrequency;
  folder: string;
  cleanupFilePaths?: string[];
}

export class OperationalDataService {
  constructor(
    private readonly repository: OperationalDataRepository = new OperationalDataRepository(),
    private readonly scanner: ExcelScannerService = new ExcelScannerService(),
    private readonly metadataReader: ExcelMetadataReaderService = new ExcelMetadataReaderService(),
    private readonly validator: ExcelValidatorService = new ExcelValidatorService(),
    private readonly cloudWorkbook: CloudWorkbookService = new CloudWorkbookService(),
    private readonly graphAuth: GraphAuthService = graphAuthService,
    private readonly relationshipPreview: ExcelRelationshipPreviewService = new ExcelRelationshipPreviewService(),
    private readonly graphFiles: GraphFileService = graphFileService
  ) {}

  getGraphAuthorizationUrl(): GraphAuthUrlResponseDto {
    return this.graphAuth.getAuthorizationUrl();
  }

  async exchangeGraphAuthorizationCode(input: unknown): Promise<GraphAuthStatusResponseDto> {
    const payload = validateGraphAuthExchangeInput(input);
    return this.graphAuth.exchangeAuthorizationCode(payload.code);
  }

  async processGraphAuthorizationCallback(input: unknown): Promise<void> {
    if (input == null || typeof input !== "object") {
      throw new ValidationError("Graph auth callback payload must be an object.");
    }
    const payload = input as Record<string, unknown>;
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      throw new ValidationError(`Microsoft Graph authentication failed. ${payload.error}`);
    }

    const rawCode = Array.isArray(payload.code) ? payload.code[0] : payload.code;
    const validated = validateGraphAuthExchangeInput({
      code: rawCode,
    });
    await this.graphAuth.exchangeAuthorizationCode(validated.code);
  }

  async getGraphAuthStatus(): Promise<GraphAuthStatusResponseDto> {
    return this.graphAuth.getAuthStatus();
  }

  async listOneDriveDrives(): Promise<OneDriveDriveDto[]> {
    return this.graphFiles.listDrives();
  }

  async browseOneDriveItems(input: unknown): Promise<BrowseOneDriveItemsResponseDto> {
    const payload = validateBrowseOneDriveItemsInput(input);
    return this.graphFiles.browseItems(payload.driveId, payload.parentItemId);
  }

  async getSettings(): Promise<OperationalDataSettingsDto> {
    const settings = await this.repository.getSettings();
    return {
      ...settings,
      syncFrequency: normalizeOrFallback(settings.syncFrequency, OPERATIONAL_SYNC_FREQUENCIES, "MANUAL"),
    };
  }

  async scanFolder(input: unknown): Promise<OperationalFolderScanResponseDto> {
    const payload = validateScanFolderInput(input);
    return {
      files: this.scanner.scanFolder(payload.folder),
    };
  }

  async loadWorksheets(input: unknown): Promise<WorkbookWorksheetsResponseDto> {
    const payload = validateLoadWorksheetsInput(input);
    const filePath = resolveWorkbook(payload.folder, payload.workbook);
    const worksheets = this.metadataReader.listWorksheets(filePath);
    return {
      worksheets,
      autoSelectedWorksheet: worksheets.length === 1 ? worksheets[0] : null,
    };
  }

  async validateWorkbookUrls(input: unknown): Promise<ValidateWorkbookUrlsResponseDto> {
    const payload = validateWorkbookUrlsInput(input);
    const masterSource = normalizeSourceIdentity({
      workbookUrl: payload.masterWorkbookUrl,
      driveId: payload.masterDriveId,
      itemId: payload.masterItemId,
    });
    const inventorySource = normalizeSourceIdentity({
      workbookUrl: payload.inventoryWorkbookUrl,
      driveId: payload.inventoryDriveId,
      itemId: payload.inventoryItemId,
    });
    const [masterWorkbook, inventoryWorkbook] = await Promise.all([
      this.getWorkbookMetadataFromSource(masterSource, "Master"),
      this.getWorkbookMetadataFromSource(inventorySource, "Inventory"),
    ]);
    return { masterWorkbook, inventoryWorkbook };
  }

  async loadWorkbookHeaders(input: unknown): Promise<LoadWorkbookHeadersResponseDto> {
    const payload = validateWorkbookHeadersInput(input);
    const masterSource = normalizeSourceIdentity({
      workbookUrl: payload.masterWorkbookUrl,
      driveId: payload.masterDriveId,
      itemId: payload.masterItemId,
    });
    const inventorySource = normalizeSourceIdentity({
      workbookUrl: payload.inventoryWorkbookUrl,
      driveId: payload.inventoryDriveId,
      itemId: payload.inventoryItemId,
    });
    const [masterHeaders, inventoryHeaders] = await Promise.all([
      this.loadWorkbookHeadersFromSource(masterSource, payload.masterWorksheet, payload.headerRow ?? 1, "Master"),
      this.loadWorkbookHeadersFromSource(
        inventorySource,
        payload.inventoryWorksheet,
        payload.headerRow ?? 1,
        "Inventory"
      ),
    ]);
    return {
      headerRow: payload.headerRow ?? 1,
      masterHeaders,
      inventoryHeaders,
    };
  }

  async detectMappingSuggestions(input: unknown): Promise<DetectMappingSuggestionsResponseDto> {
    const payload = validateDetectMappingsInput(input);
    const suggestions: MappingSuggestionDto[] = [];
    for (const source of payload.masterHeaders) {
      let bestScore = 0;
      let bestTarget: string | null = null;
      for (const target of payload.inventoryHeaders) {
        const score = scoreHeaders(source, target);
        if (score > bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      }
      if (bestTarget && bestScore >= 0.5) {
        suggestions.push({
          sourceColumn: source,
          targetColumn: bestTarget,
          confidence: Number((bestScore * 100).toFixed(2)),
        });
      }
    }

    const relationship = suggestions
      .filter((item) => item.confidence >= 70)
      .sort((left, right) => right.confidence - left.confidence)[0];
    return {
      relationship: relationship
        ? {
            masterColumn: relationship.sourceColumn,
            inventoryColumn: relationship.targetColumn,
            confidence: relationship.confidence,
          }
        : null,
      suggestions,
    };
  }

  async previewConfiguration(input: unknown): Promise<PreviewOperationalConfigurationResponseDto> {
    const payload = validatePreviewConfigurationInput(input);
    const headerRow = payload.headerRow ?? 1;
    const masterSource = normalizeSourceIdentity({
      workbookUrl: payload.masterWorkbookUrl,
      driveId: payload.masterDriveId,
      itemId: payload.masterItemId,
    });
    const inventorySource = normalizeSourceIdentity({
      workbookUrl: payload.inventoryWorkbookUrl,
      driveId: payload.inventoryDriveId,
      itemId: payload.inventoryItemId,
    });
    const [masterDownload, inventoryDownload] = await Promise.all([
      this.downloadWorkbookToTempFromSource(masterSource, "wizard-master", "Master"),
      this.downloadWorkbookToTempFromSource(inventorySource, "wizard-inventory", "Inventory"),
    ]);

    try {
      const masterHeaders = this.metadataReader
        .listWorksheets(masterDownload.tempFilePath)
        .includes(payload.masterWorksheet)
        ? await this.loadWorkbookHeadersFromSource(masterSource, payload.masterWorksheet, headerRow, "Master")
        : [];
      const inventoryHeaders = this.metadataReader
        .listWorksheets(inventoryDownload.tempFilePath)
        .includes(payload.inventoryWorksheet)
        ? await this.loadWorkbookHeadersFromSource(inventorySource, payload.inventoryWorksheet, headerRow, "Inventory")
        : [];

      const master = this.relationshipPreview.extractColumnValues(
        masterDownload.tempFilePath,
        payload.masterWorksheet,
        headerRow,
        payload.relationshipMasterColumn
      );
      const inventory = this.relationshipPreview.extractColumnValues(
        inventoryDownload.tempFilePath,
        payload.inventoryWorksheet,
        headerRow,
        payload.relationshipInventoryColumn
      );

      const masterSet = new Set(master.values);
      const inventorySet = new Set(inventory.values);
      let matched = 0;
      for (const key of masterSet) {
        if (inventorySet.has(key)) {
          matched += 1;
        }
      }

      const rowsRead = master.totalRows + inventory.totalRows;
      const duplicateMasterKeys = master.duplicates;
      const duplicateInventoryKeys = inventory.duplicates;
      const relationshipFailures = Math.max(masterSet.size - matched, 0) + Math.max(inventorySet.size - matched, 0);
      const rowsInvalid = duplicateMasterKeys + duplicateInventoryKeys + relationshipFailures;
      const rowsValid = Math.max(rowsRead - rowsInvalid, 0);
      const settings = await this.repository.getSettings();
      const rowsInsert = settings.lastSyncTime ? Math.max(masterSet.size - matched, 0) : rowsValid;
      const rowsUpdate = settings.lastSyncTime ? matched : 0;
      const rowsIgnore = duplicateMasterKeys + duplicateInventoryKeys;
      const previewChanges = Array.from(masterSet)
        .slice(0, 100)
        .map((key) => ({
          key,
          action: (inventorySet.has(key) ? (settings.lastSyncTime ? "UPDATE" : "INSERT") : "INSERT") as
            | "INSERT"
            | "UPDATE"
            | "IGNORE",
        }));

      if ("saveDryRunResult" in this.repository && typeof this.repository.saveDryRunResult === "function") {
        await this.repository.saveDryRunResult({
          rowsRead,
          rowsValid,
          rowsInvalid,
          rowsInsert,
          rowsUpdate,
          rowsIgnore,
          relationshipFailures,
          validationErrors: rowsInvalid,
          mappingErrors: 0,
          previewChanges,
          operator: "SYSTEM",
        });
      }

      return {
        masterWorkbookName: masterDownload.workbookName,
        inventoryWorkbookName: inventoryDownload.workbookName,
        masterWorksheet: payload.masterWorksheet,
        inventoryWorksheet: payload.inventoryWorksheet,
        headerCountMaster: masterHeaders.length,
        headerCountInventory: inventoryHeaders.length,
        relationshipMasterColumn: payload.relationshipMasterColumn,
        relationshipInventoryColumn: payload.relationshipInventoryColumn,
        masterRows: master.totalRows,
        inventoryRows: inventory.totalRows,
        matchedRecordsEstimate: matched,
        missingMasterKeys: Math.max(masterSet.size - matched, 0),
        missingInventoryKeys: Math.max(inventorySet.size - matched, 0),
        duplicateMasterKeys,
        duplicateInventoryKeys,
        rowsRead,
        rowsValid,
        rowsInvalid,
        rowsInsert,
        rowsUpdate,
        rowsIgnore,
        relationshipFailures,
        validationErrors: rowsInvalid,
        columnMappingErrors: 0,
        previewChanges,
      };
    } finally {
      this.cloudWorkbook.cleanupTempFile(masterDownload.tempFilePath);
      this.cloudWorkbook.cleanupTempFile(inventoryDownload.tempFilePath);
    }
  }

  async validateConfiguration(input: unknown): Promise<ValidateOperationalDataResponseDto> {
    const payload = validateOperationalDataInput(input);
    const settings = await this.repository.getSettings();

    const masterColumnMapping = this.mergeMasterMapping(settings.masterColumnMapping, payload.masterColumnMapping);
    const inventoryColumnMapping = this.mergeInventoryMapping(
      settings.inventoryColumnMapping,
      payload.inventoryColumnMapping
    );

    const resolved = this.resolveConfiguredWorksheets(
      payload.operationalDataFolder,
      payload.masterWorkbook,
      payload.masterWorksheet,
      payload.inventoryWorkbook,
      payload.inventoryWorksheet
    );

    const validation = this.validator.validate({
      payload,
      masterFilePath: resolved.masterPath,
      inventoryFilePath: resolved.inventoryPath,
      masterWorksheet: resolved.masterWorksheet,
      inventoryWorksheet: resolved.inventoryWorksheet,
      masterColumnMapping,
      inventoryColumnMapping,
    });

    if (!validation.isValid) {
      throw new ValidationError("Operational data validation failed.", {
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    await this.repository.saveSyncStatus({
      ...(await this.repository.getSettings()),
      lastValidation: new Date().toISOString(),
      workbookHash: `${validation.masterWorkbookHash}|${validation.inventoryWorkbookHash}`,
      worksheetHash: this.validator.computeWorksheetHash(
        validation.resolvedMasterWorksheet,
        validation.resolvedInventoryWorksheet
      ),
    });

    return validation;
  }

  async saveWizardConfiguration(input: unknown): Promise<OperationalDataSettingsDto> {
    const payload = validateSaveWizardConfigurationInput(input);
    const workbookValidation = await this.validateWorkbookUrls({
      masterWorkbookUrl: payload.masterWorkbookUrl,
      inventoryWorkbookUrl: payload.inventoryWorkbookUrl,
      masterDriveId: payload.masterDriveId,
      masterItemId: payload.masterItemId,
      inventoryDriveId: payload.inventoryDriveId,
      inventoryItemId: payload.inventoryItemId,
    });
    const headers = await this.loadWorkbookHeaders({
      masterWorkbookUrl: payload.masterWorkbookUrl,
      inventoryWorkbookUrl: payload.inventoryWorkbookUrl,
      masterDriveId: payload.masterDriveId,
      masterItemId: payload.masterItemId,
      inventoryDriveId: payload.inventoryDriveId,
      inventoryItemId: payload.inventoryItemId,
      masterWorksheet: payload.masterWorksheet,
      inventoryWorksheet: payload.inventoryWorksheet,
      headerRow: payload.headerRow,
    });

    const structureHash = computeStructureHash(
      payload.masterWorksheet,
      payload.inventoryWorksheet,
      headers.masterHeaders,
      headers.inventoryHeaders
    );

    const masterSource = normalizeSourceIdentity({
      workbookUrl: payload.masterWorkbookUrl,
      driveId: payload.masterDriveId,
      itemId: payload.masterItemId,
    });
    const inventorySource = normalizeSourceIdentity({
      workbookUrl: payload.inventoryWorkbookUrl,
      driveId: payload.inventoryDriveId,
      itemId: payload.inventoryItemId,
    });
    const masterDownload = await this.downloadWorkbookToTempFromSource(masterSource, "wizard-master-save", "Master");
    const inventoryDownload = await this.downloadWorkbookToTempFromSource(
      inventorySource,
      "wizard-inventory-save",
      "Inventory"
    );
    try {
      const validation = this.validator.validate({
        payload: {
          operationalDataFolder: "",
          masterWorkbook: workbookValidation.masterWorkbook.workbookName,
          masterWorksheet: payload.masterWorksheet,
          inventoryWorkbook: workbookValidation.inventoryWorkbook.workbookName,
          inventoryWorksheet: payload.inventoryWorksheet,
        },
        masterFilePath: masterDownload.tempFilePath,
        inventoryFilePath: inventoryDownload.tempFilePath,
        masterWorksheet: payload.masterWorksheet,
        inventoryWorksheet: payload.inventoryWorksheet,
        masterColumnMapping: payload.masterColumnMapping,
        inventoryColumnMapping: payload.inventoryColumnMapping,
      });
      if (!validation.isValid) {
        throw new ValidationError("Operational data validation failed.", {
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      const previousSettings = await this.repository.getSettings();
      const previousVersion =
        typeof previousSettings.configurationVersion === "number"
          ? previousSettings.configurationVersion
          : Number.parseInt(String(previousSettings.configurationVersion ?? "0"), 10);
      const nextConfigurationVersion = Number.isFinite(previousVersion) ? previousVersion + 1 : 1;

      await this.repository.saveConfiguration({
        operationalDataFolder: "",
        masterWorkbook: workbookValidation.masterWorkbook.workbookName,
        masterWorkbookUrl: payload.masterWorkbookUrl ?? null,
        masterDriveId: payload.masterDriveId,
        masterItemId: payload.masterItemId,
        masterWorksheet: payload.masterWorksheet,
        inventoryWorkbook: workbookValidation.inventoryWorkbook.workbookName,
        inventoryWorkbookUrl: payload.inventoryWorkbookUrl ?? null,
        inventoryDriveId: payload.inventoryDriveId,
        inventoryItemId: payload.inventoryItemId,
        inventoryWorksheet: payload.inventoryWorksheet,
        relationshipMasterColumn: payload.relationshipMasterColumn,
        relationshipInventoryColumn: payload.relationshipInventoryColumn,
        headerRow: payload.headerRow,
        autoDetectedMappings: payload.autoDetectedMappings,
        manualMappings: payload.manualMappings,
        masterColumnMapping: payload.masterColumnMapping,
        inventoryColumnMapping: payload.inventoryColumnMapping,
        autoSyncEnabled: payload.autoSyncEnabled,
        syncFrequency: payload.syncFrequency,
        configurationVersion: nextConfigurationVersion,
      });

      await this.repository.saveSyncStatus({
        ...(await this.repository.getSettings()),
        lastValidation: new Date().toISOString(),
        lastSyncStatus: "IDLE",
        masterDeploymentLastModified: masterDownload.modifiedDate,
        inventoryLastModified: inventoryDownload.modifiedDate,
        workbookHash: `${masterDownload.workbookHash}|${inventoryDownload.workbookHash}`,
        worksheetHash: this.validator.computeWorksheetHash(payload.masterWorksheet, payload.inventoryWorksheet),
        workbookStructureHash: structureHash,
        workbookVersion: `${masterDownload.modifiedDate ?? "na"}|${inventoryDownload.modifiedDate ?? "na"}`,
      });
    } finally {
      this.cloudWorkbook.cleanupTempFile(masterDownload.tempFilePath);
      this.cloudWorkbook.cleanupTempFile(inventoryDownload.tempFilePath);
    }

    return this.getSettings();
  }

  async saveSettings(input: unknown): Promise<OperationalDataSettingsDto> {
    const payload = validateUpdateOperationalDataInput(input);

    const resolved = this.resolveConfiguredWorksheets(
      payload.operationalDataFolder,
      payload.masterWorkbook,
      payload.masterWorksheet,
      payload.inventoryWorkbook,
      payload.inventoryWorksheet
    );

    const validation = this.validator.validate({
      payload,
      masterFilePath: resolved.masterPath,
      inventoryFilePath: resolved.inventoryPath,
      masterWorksheet: resolved.masterWorksheet,
      inventoryWorksheet: resolved.inventoryWorksheet,
      masterColumnMapping: payload.masterColumnMapping,
      inventoryColumnMapping: payload.inventoryColumnMapping,
    });

    if (!validation.isValid) {
      throw new ValidationError("Operational data validation failed.", {
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    await this.repository.saveConfiguration({
      operationalDataFolder: payload.operationalDataFolder,
      masterWorkbook: payload.masterWorkbook,
      masterWorkbookUrl: payload.masterWorkbookUrl,
      masterDriveId: payload.masterDriveId,
      masterItemId: payload.masterItemId,
      masterWorksheet: resolved.masterWorksheet,
      inventoryWorkbook: payload.inventoryWorkbook,
      inventoryWorkbookUrl: payload.inventoryWorkbookUrl,
      inventoryDriveId: payload.inventoryDriveId,
      inventoryItemId: payload.inventoryItemId,
      inventoryWorksheet: resolved.inventoryWorksheet,
      relationshipMasterColumn: payload.relationshipMasterColumn,
      relationshipInventoryColumn: payload.relationshipInventoryColumn,
      headerRow: payload.headerRow ?? 1,
      autoDetectedMappings: payload.autoDetectedMappings,
      manualMappings: payload.manualMappings,
      masterColumnMapping: payload.masterColumnMapping,
      inventoryColumnMapping: payload.inventoryColumnMapping,
      autoSyncEnabled: payload.autoSyncEnabled,
      syncFrequency: payload.syncFrequency,
    });

    await this.repository.saveSyncStatus({
      lastSyncTime: null,
      lastSuccessfulSync: null,
      lastValidation: new Date().toISOString(),
      lastSyncStatus: "IDLE",
      lastSyncDuration: null,
      lastSyncRowsImported: 0,
      lastSyncRowsUpdated: 0,
      lastSyncRowsFailed: 0,
      masterDeploymentLastModified: getLastModifiedIso(resolved.masterPath),
      inventoryLastModified: getLastModifiedIso(resolved.inventoryPath),
      workbookHash: `${validation.masterWorkbookHash}|${validation.inventoryWorkbookHash}`,
      worksheetHash: this.validator.computeWorksheetHash(resolved.masterWorksheet, resolved.inventoryWorksheet),
    });

    return this.getSettings();
  }

  async saveConfigurationDraft(input: unknown): Promise<OperationalDataSettingsDto> {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new ValidationError("Operational configuration draft must be an object.");
    }
    const draft = input as Record<string, unknown>;
    const current = await this.repository.getSettings();
    const stringFields = [
      "masterWorkbook", "masterWorkbookUrl", "masterDriveId", "masterItemId", "masterWorksheet",
      "inventoryWorkbook", "inventoryWorkbookUrl", "inventoryDriveId", "inventoryItemId", "inventoryWorksheet",
      "relationshipMasterColumn", "relationshipInventoryColumn", "syncFrequency",
    ] as const;
    const next: OperationalDataConfigRecord = { ...current };
    for (const field of stringFields) {
      if (typeof draft[field] === "string") {
        (next as unknown as Record<string, unknown>)[field] = draft[field].trim();
      }
    }
    if (typeof draft.autoSyncEnabled === "boolean") next.autoSyncEnabled = draft.autoSyncEnabled;
    const previousVersion = Number(current.configurationVersion ?? 0);
    next.configurationVersion = Number.isFinite(previousVersion) ? previousVersion + 1 : 1;
    await this.repository.saveConfiguration(next);
    return this.getSettings();
  }

  async getSyncRuntimeConfiguration(): Promise<SyncRuntimeConfiguration> {
    const settings = await this.repository.getSettings();
    const syncFrequency = normalizeOrFallback(settings.syncFrequency, OPERATIONAL_SYNC_FREQUENCIES, "MANUAL");
    const hasUrlSource = Boolean(settings.masterWorkbookUrl && settings.inventoryWorkbookUrl);
    const hasDriveItemSource = Boolean(
      settings.masterDriveId && settings.masterItemId && settings.inventoryDriveId && settings.inventoryItemId
    );

    if (!hasUrlSource && !hasDriveItemSource) {
      throw new ValidationError(
        "Workbook source configuration is incomplete. Provide workbook URLs or drive/item identifiers for both workbooks."
      );
    }

    if (hasDriveItemSource) {
      return this.getDriveItemBackedRuntime(settings, syncFrequency);
    }

    return this.getUrlBackedRuntime(settings, syncFrequency);
  }

  async recordSyncStatus(input: {
    lastSyncTime: string;
    status: "SUCCESS" | "FAILED";
    durationMs: number;
    rowsImported: number;
    rowsUpdated: number;
    rowsFailed: number;
    masterDeploymentLastModified: string | null;
    inventoryLastModified: string | null;
    workbookHash: string | null;
    worksheetHash: string | null;
  }): Promise<void> {
    const previous = await this.repository.getSettings();
    await this.repository.saveSyncStatus({
      ...previous,
      lastSyncTime: input.lastSyncTime,
      lastSuccessfulSync: input.status === "SUCCESS" ? input.lastSyncTime : previous.lastSuccessfulSync,
      lastValidation: previous.lastValidation,
      lastSyncStatus: input.status,
      lastSyncDuration: input.durationMs,
      lastSyncRowsImported: input.rowsImported,
      lastSyncRowsUpdated: input.rowsUpdated,
      lastSyncRowsFailed: input.rowsFailed,
      masterDeploymentLastModified: input.masterDeploymentLastModified,
      inventoryLastModified: input.inventoryLastModified,
      workbookHash: input.workbookHash,
      worksheetHash: input.worksheetHash,
    });
  }

  private async getUrlBackedRuntime(
    settings: Awaited<ReturnType<OperationalDataRepository["getSettings"]>>,
    syncFrequency: OperationalSyncFrequency
  ): Promise<SyncRuntimeConfiguration> {
    if (!settings.masterWorkbookUrl || !settings.inventoryWorkbookUrl) {
      throw new ValidationError("Workbook URL source is incomplete.");
    }
    const masterDownload = await this.cloudWorkbook.downloadToTempFile(settings.masterWorkbookUrl ?? "", "sync-master");
    const inventoryDownload = await this.cloudWorkbook.downloadToTempFile(
      settings.inventoryWorkbookUrl ?? "",
      "sync-inventory"
    );

    const masterWorksheet = this.resolveWorksheet(
      settings.masterWorksheet,
      this.metadataReader.listWorksheets(masterDownload.tempFilePath)
    );
    const inventoryWorksheet = this.resolveWorksheet(
      settings.inventoryWorksheet,
      this.metadataReader.listWorksheets(inventoryDownload.tempFilePath)
    );

    const masterRelationshipColumn = settings.relationshipMasterColumn?.trim() || settings.masterColumnMapping.mvTrackNumber;
    const inventoryRelationshipColumn =
      settings.relationshipInventoryColumn?.trim() || settings.inventoryColumnMapping.mvTrackNumber;
    const masterColumnMapping: MasterColumnMappingDto = {
      ...settings.masterColumnMapping,
      mvTrackNumber: masterRelationshipColumn,
    };
    const inventoryColumnMapping: InventoryColumnMappingDto = {
      ...settings.inventoryColumnMapping,
      mvTrackNumber: inventoryRelationshipColumn,
    };

    const validation = this.validator.validate({
      payload: {
        operationalDataFolder: "",
        masterWorkbook: masterDownload.workbookName,
        masterWorksheet,
        inventoryWorkbook: inventoryDownload.workbookName,
        inventoryWorksheet,
      },
      masterFilePath: masterDownload.tempFilePath,
      inventoryFilePath: inventoryDownload.tempFilePath,
      masterWorksheet,
      inventoryWorksheet,
      masterColumnMapping,
      inventoryColumnMapping,
    });

    const masterHeaders = this.cloudWorkbook
      .loadHeaders(settings.masterWorkbookUrl ?? "", masterWorksheet, settings.headerRow ?? 1)
      .then((value) => value);
    const inventoryHeaders = this.cloudWorkbook
      .loadHeaders(settings.inventoryWorkbookUrl ?? "", inventoryWorksheet, settings.headerRow ?? 1)
      .then((value) => value);

    const [resolvedMasterHeaders, resolvedInventoryHeaders] = await Promise.all([masterHeaders, inventoryHeaders]);
    const structureHash = computeStructureHash(
      masterWorksheet,
      inventoryWorksheet,
      resolvedMasterHeaders,
      resolvedInventoryHeaders
    );
    if (settings.workbookStructureHash && settings.workbookStructureHash !== structureHash) {
      throw new ValidationError("Workbook structure changed. Administrator review required.");
    }
    this.logRelationshipDiagnostics(
      masterDownload.tempFilePath,
      inventoryDownload.tempFilePath,
      masterWorksheet,
      inventoryWorksheet,
      settings.headerRow ?? 1,
      masterRelationshipColumn,
      inventoryRelationshipColumn
    );

    const metadata: SyncFileSystemMetadataDto = {
      masterDeploymentFullPath: masterDownload.tempFilePath,
      inventoryFullPath: inventoryDownload.tempFilePath,
      masterDeploymentLastModified: masterDownload.modifiedDate ?? new Date().toISOString(),
      inventoryLastModified: inventoryDownload.modifiedDate ?? new Date().toISOString(),
      masterWorkbookHash: masterDownload.workbookHash,
      inventoryWorkbookHash: inventoryDownload.workbookHash,
      worksheetHash: this.validator.computeWorksheetHash(masterWorksheet, inventoryWorksheet),
    };

    return {
      config: {
        scheduler: {
          enabled: settings.autoSyncEnabled,
          mode: syncFrequency,
          historyLimit: 50,
        },
        masterDeployment: {
          workbookName: masterDownload.workbookName,
          filePath: masterDownload.tempFilePath,
          sheetName: masterWorksheet,
          activeStatuses: ["ACTIVE", "PENDING"],
          columnMapping: masterColumnMapping,
        },
        inventoryNspl: {
          workbookName: inventoryDownload.workbookName,
          filePath: inventoryDownload.tempFilePath,
          sheetName: inventoryWorksheet,
          columnMapping: inventoryColumnMapping,
        },
      },
      metadata,
      schedulerMode: syncFrequency,
      folder: "",
      cleanupFilePaths: [masterDownload.tempFilePath, inventoryDownload.tempFilePath],
    };
  }

  private async getDriveItemBackedRuntime(
    settings: Awaited<ReturnType<OperationalDataRepository["getSettings"]>>,
    syncFrequency: OperationalSyncFrequency
  ): Promise<SyncRuntimeConfiguration> {
    if (!settings.masterDriveId || !settings.masterItemId || !settings.inventoryDriveId || !settings.inventoryItemId) {
      throw new ValidationError("Drive/item workbook source is incomplete.");
    }
    const masterDownload = await this.cloudWorkbook.downloadToTempFileByDriveItem(
      settings.masterDriveId,
      settings.masterItemId,
      "sync-master"
    );
    const inventoryDownload = await this.cloudWorkbook.downloadToTempFileByDriveItem(
      settings.inventoryDriveId,
      settings.inventoryItemId,
      "sync-inventory"
    );

    const masterWorksheet = this.resolveWorksheet(
      settings.masterWorksheet,
      this.metadataReader.listWorksheets(masterDownload.tempFilePath)
    );
    const inventoryWorksheet = this.resolveWorksheet(
      settings.inventoryWorksheet,
      this.metadataReader.listWorksheets(inventoryDownload.tempFilePath)
    );

    const masterRelationshipColumn = settings.relationshipMasterColumn?.trim() || settings.masterColumnMapping.mvTrackNumber;
    const inventoryRelationshipColumn =
      settings.relationshipInventoryColumn?.trim() || settings.inventoryColumnMapping.mvTrackNumber;
    const masterColumnMapping: MasterColumnMappingDto = {
      ...settings.masterColumnMapping,
      mvTrackNumber: masterRelationshipColumn,
    };
    const inventoryColumnMapping: InventoryColumnMappingDto = {
      ...settings.inventoryColumnMapping,
      mvTrackNumber: inventoryRelationshipColumn,
    };

    const validation = this.validator.validate({
      payload: {
        operationalDataFolder: "",
        masterWorkbook: masterDownload.workbookName,
        masterWorksheet,
        inventoryWorkbook: inventoryDownload.workbookName,
        inventoryWorksheet,
      },
      masterFilePath: masterDownload.tempFilePath,
      inventoryFilePath: inventoryDownload.tempFilePath,
      masterWorksheet,
      inventoryWorksheet,
      masterColumnMapping,
      inventoryColumnMapping,
    });

    if (!validation.isValid) {
      throw new ValidationError("Operational data validation failed.", {
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const [resolvedMasterHeaders, resolvedInventoryHeaders] = await Promise.all([
      this.cloudWorkbook.loadHeadersByDriveItem(
        settings.masterDriveId,
        settings.masterItemId,
        masterWorksheet,
        settings.headerRow ?? 1
      ),
      this.cloudWorkbook.loadHeadersByDriveItem(
        settings.inventoryDriveId,
        settings.inventoryItemId,
        inventoryWorksheet,
        settings.headerRow ?? 1
      ),
    ]);
    const structureHash = computeStructureHash(
      masterWorksheet,
      inventoryWorksheet,
      resolvedMasterHeaders,
      resolvedInventoryHeaders
    );
    if (settings.workbookStructureHash && settings.workbookStructureHash !== structureHash) {
      throw new ValidationError("Workbook structure changed. Administrator review required.");
    }
    this.logRelationshipDiagnostics(
      masterDownload.tempFilePath,
      inventoryDownload.tempFilePath,
      masterWorksheet,
      inventoryWorksheet,
      settings.headerRow ?? 1,
      masterRelationshipColumn,
      inventoryRelationshipColumn
    );

    const metadata: SyncFileSystemMetadataDto = {
      masterDeploymentFullPath: masterDownload.tempFilePath,
      inventoryFullPath: inventoryDownload.tempFilePath,
      masterDeploymentLastModified: masterDownload.modifiedDate ?? new Date().toISOString(),
      inventoryLastModified: inventoryDownload.modifiedDate ?? new Date().toISOString(),
      masterWorkbookHash: masterDownload.workbookHash,
      inventoryWorkbookHash: inventoryDownload.workbookHash,
      worksheetHash: this.validator.computeWorksheetHash(masterWorksheet, inventoryWorksheet),
    };

    return {
      config: {
        scheduler: {
          enabled: settings.autoSyncEnabled,
          mode: syncFrequency,
          historyLimit: 50,
        },
        masterDeployment: {
          workbookName: masterDownload.workbookName,
          filePath: masterDownload.tempFilePath,
          sheetName: masterWorksheet,
          activeStatuses: ["ACTIVE", "PENDING"],
          columnMapping: masterColumnMapping,
        },
        inventoryNspl: {
          workbookName: inventoryDownload.workbookName,
          filePath: inventoryDownload.tempFilePath,
          sheetName: inventoryWorksheet,
          columnMapping: inventoryColumnMapping,
        },
      },
      metadata,
      schedulerMode: syncFrequency,
      folder: "",
      cleanupFilePaths: [masterDownload.tempFilePath, inventoryDownload.tempFilePath],
    };
  }

  private async getWorkbookMetadataFromSource(
    source: WorkbookSourceInput,
    workbookLabel: "Master" | "Inventory"
  ): Promise<ValidateWorkbookUrlsResponseDto["masterWorkbook"]> {
    if (hasSourceIdentity(source) && source.driveId && source.itemId) {
      return this.cloudWorkbook.getWorkbookMetadataByDriveItem(source.driveId, source.itemId);
    }
    if (source.workbookUrl) {
      return this.cloudWorkbook.getWorkbookMetadata(source.workbookUrl);
    }
    throw new ValidationError(`${workbookLabel} workbook source is required.`);
  }

  private async loadWorkbookHeadersFromSource(
    source: WorkbookSourceInput,
    worksheetName: string,
    headerRow: number,
    workbookLabel: "Master" | "Inventory"
  ): Promise<string[]> {
    if (hasSourceIdentity(source) && source.driveId && source.itemId) {
      return this.cloudWorkbook.loadHeadersByDriveItem(source.driveId, source.itemId, worksheetName, headerRow);
    }
    if (source.workbookUrl) {
      return this.cloudWorkbook.loadHeaders(source.workbookUrl, worksheetName, headerRow);
    }
    throw new ValidationError(`${workbookLabel} workbook source is required.`);
  }

  private normalizeRelationshipKey(value: string): string {
    const upper = value.trim().toUpperCase();
    const alphanumeric = upper.replace(/[^A-Z0-9]/g, "");
    if (!alphanumeric) {
      return "";
    }
    return alphanumeric.replace(/(^|[A-Z])0+(?=\d)/g, "$1");
  }

  private logRelationshipDiagnostics(
    masterPath: string,
    inventoryPath: string,
    masterWorksheet: string,
    inventoryWorksheet: string,
    headerRow: number,
    masterRelationshipColumn: string,
    inventoryRelationshipColumn: string
  ): void {
    const master = this.relationshipPreview.extractColumnValues(
      masterPath,
      masterWorksheet,
      headerRow,
      masterRelationshipColumn
    );
    const inventory = this.relationshipPreview.extractColumnValues(
      inventoryPath,
      inventoryWorksheet,
      headerRow,
      inventoryRelationshipColumn
    );
    const masterKeys = new Set(master.values.map((value) => this.normalizeRelationshipKey(value)).filter(Boolean));
    const inventoryKeys = new Set(
      inventory.values.map((value) => this.normalizeRelationshipKey(value)).filter(Boolean)
    );
    let matched = 0;
    for (const key of masterKeys) {
      if (inventoryKeys.has(key)) {
        matched += 1;
      }
    }
    logger.info({
      scope: "excel-sync",
      event: "Relationship Join Diagnostics",
      masterWorksheet,
      inventoryWorksheet,
      relationshipMasterColumn: masterRelationshipColumn,
      relationshipInventoryColumn: inventoryRelationshipColumn,
      masterSampleValues: master.values.slice(0, 10),
      inventorySampleValues: inventory.values.slice(0, 10),
      masterDistinctKeys: masterKeys.size,
      inventoryDistinctKeys: inventoryKeys.size,
      matchedKeys: matched,
      unmatchedMasterKeys: Math.max(masterKeys.size - matched, 0),
      unmatchedInventoryKeys: Math.max(inventoryKeys.size - matched, 0),
    });
  }

  private async downloadWorkbookToTempFromSource(
    source: WorkbookSourceInput,
    prefix: string,
    workbookLabel: "Master" | "Inventory"
  ) {
    if (hasSourceIdentity(source) && source.driveId && source.itemId) {
      return this.cloudWorkbook.downloadToTempFileByDriveItem(source.driveId, source.itemId, prefix);
    }
    if (source.workbookUrl) {
      return this.cloudWorkbook.downloadToTempFile(source.workbookUrl, prefix);
    }
    throw new ValidationError(`${workbookLabel} workbook source is required.`);
  }

  private resolveConfiguredWorksheets(
    folder: string,
    masterWorkbook: string,
    masterWorksheet: string | undefined,
    inventoryWorkbook: string,
    inventoryWorksheet: string | undefined
  ): { masterPath: string; inventoryPath: string; masterWorksheet: string; inventoryWorksheet: string } {
    const normalizedFolder = folder.trim();
    if (!normalizedFolder || !fs.existsSync(normalizedFolder) || !fs.statSync(normalizedFolder).isDirectory()) {
      throw new ValidationError("Folder not found.");
    }

    const masterPath = resolveWorkbook(normalizedFolder, masterWorkbook);
    const inventoryPath = resolveWorkbook(normalizedFolder, inventoryWorkbook);
    if (!fs.existsSync(masterPath) || !fs.existsSync(inventoryPath)) {
      throw new ValidationError("Workbook not found.");
    }

    const masterWorksheets = this.metadataReader.listWorksheets(masterPath);
    const inventoryWorksheets = this.metadataReader.listWorksheets(inventoryPath);
    const resolvedMasterWorksheet = this.resolveWorksheet(masterWorksheet, masterWorksheets);
    const resolvedInventoryWorksheet = this.resolveWorksheet(inventoryWorksheet, inventoryWorksheets);

    return {
      masterPath,
      inventoryPath,
      masterWorksheet: resolvedMasterWorksheet,
      inventoryWorksheet: resolvedInventoryWorksheet,
    };
  }

  private resolveWorksheet(requested: string | undefined, available: string[]): string {
    const normalizedRequested = requested?.trim();
    if (normalizedRequested) {
      if (!available.includes(normalizedRequested)) {
        throw new ValidationError(`Configured worksheet no longer exists. Available worksheets: ${available.join(", ")}`);
      }
      return normalizedRequested;
    }

    if (available.length === 1) {
      return available[0];
    }

    throw new ValidationError(`Configured worksheet no longer exists. Available worksheets: ${available.join(", ")}`);
  }

  private mergeMasterMapping(
    current: MasterColumnMappingDto,
    incoming: Partial<MasterColumnMappingDto> | undefined
  ): MasterColumnMappingDto {
    return { ...current, ...(incoming ?? {}) };
  }

  private mergeInventoryMapping(
    current: InventoryColumnMappingDto,
    incoming: Partial<InventoryColumnMappingDto> | undefined
  ): InventoryColumnMappingDto {
    return { ...current, ...(incoming ?? {}) };
  }
}

export const operationalDataService = new OperationalDataService();
