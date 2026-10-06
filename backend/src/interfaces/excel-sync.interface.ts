import type {
  ExcelSyncConfigDto,
  ExcelSyncEngineResultDto,
  InventoryNsplSyncRowDto,
  MasterDeploymentSyncRowDto,
  ParsedExcelRowDto,
  SyncExecutionResultDto,
  SyncPersistenceAction,
} from "../dto/excel-sync.dto";

export interface WorkbookLoader {
  loadWorkbook(filePath: string): unknown;
}

export interface SheetParser {
  parseRows(workbook: unknown, sheetName: string): ParsedExcelRowDto[];
}

export interface ExcelReader {
  readRows(filePath: string, sheetName: string): ParsedExcelRowDto[];
}

export interface RowMapper {
  mapMasterDeploymentRow(row: ParsedExcelRowDto): MasterDeploymentSyncRowDto;
  mapInventoryNsplRow(row: ParsedExcelRowDto): InventoryNsplSyncRowDto;
}

export interface RowValidationIssue {
  column: string;
  reason: string;
}

export interface RowValidationResult<T> {
  value: T | null;
  issues: RowValidationIssue[];
}

export interface ValidationService {
  validateMasterDeploymentRow(input: MasterDeploymentSyncRowDto): RowValidationResult<MasterDeploymentSyncRowDto>;
  validateInventoryNsplRow(input: InventoryNsplSyncRowDto): RowValidationResult<InventoryNsplSyncRowDto>;
}

export interface SyncRepository {
  upsertMasterDeploymentRow(row: MasterDeploymentSyncRowDto): Promise<SyncPersistenceAction>;
  upsertInventoryNsplRow(row: InventoryNsplSyncRowDto): Promise<SyncPersistenceAction>;
  pruneMasterDeploymentRows?(rowKeys: string[]): Promise<number>;
  pruneInventoryNsplRows(rowKeys: string[]): Promise<number>;
}

export interface SyncLogger {
  info(message: string | Record<string, unknown>): void;
  error(message: string | Record<string, unknown>): void;
}

export interface SyncService {
  syncMasterDeployment(config: ExcelSyncConfigDto): Promise<SyncExecutionResultDto>;
  syncInventoryNspl(config: ExcelSyncConfigDto): Promise<SyncExecutionResultDto>;
}

export interface SyncEngine {
  run(config: ExcelSyncConfigDto): Promise<ExcelSyncEngineResultDto>;
}

export interface SchedulerJobDefinition {
  id: string;
  intervalMs: number;
  execute: () => Promise<void>;
}

export interface Scheduler {
  schedule(job: SchedulerJobDefinition): void;
  stop(): void;
  getNextRunAt(): string | null;
}

export interface SyncEngineDependencies {
  syncService: SyncService;
}
