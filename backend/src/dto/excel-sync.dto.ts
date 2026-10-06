import type { InventoryColumnMappingDto, MasterColumnMappingDto } from "./operational-data.dto";

export type ExcelSyncSource = "MASTER_DEPLOYMENT" | "INVENTORY_NSPL";

export type SyncPersistenceAction = "inserted" | "updated" | "unchanged";

export interface ParsedExcelRowDto {
  rowNumber: number;
  values: Record<string, unknown>;
}

export interface MasterDeploymentSyncRowDto {
  rowNumber: number;
  rider: string;
  phone: string;
  hub: string;
  vehicle: string;
  mvTrackNumber: string;
  plan: string;
  status: string;
  deploymentDate: string;
  returnDate: string | null;
  coordinator: string;
  paidStatus: string | null;
  fddStatus: string | null;
  isLatestForRider: boolean;
}

export interface InventoryNsplSyncRowDto {
  rowNumber: number;
  mvTrackNumber: string;
  model: string;
  modelCode: string;
  vehicleStatus: string;
  hub: string;
  batteryNumber: string | null;
  chargerNumber?: string | null;
  iotDevice: string | null;
  vin: string | null;
  motorNumber: string | null;
  chassisNumber: string | null;
}

export interface RowSyncErrorDto {
  source: ExcelSyncSource;
  rowNumber: number;
  reason: string;
}

export interface SyncSummaryDto {
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  executionTimeMs: number;
}

export interface SyncExecutionResultDto {
  source: ExcelSyncSource;
  summary: SyncSummaryDto;
  errors: RowSyncErrorDto[];
}

export interface ExcelSyncEngineResultDto {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: SyncExecutionResultDto[];
}

export interface ExcelSyncConfigDto {
  scheduler: {
    enabled: boolean;
    mode: "FIVE_MINUTES" | "FIFTEEN_MINUTES" | "THIRTY_MINUTES" | "HOURLY" | "DAILY" | "MANUAL";
    historyLimit: number;
  };
  masterDeployment: {
    workbookName: string;
    filePath: string;
    sheetName: string;
    activeStatuses: string[];
    columnMapping: MasterColumnMappingDto;
  };
  inventoryNspl: {
    workbookName: string;
    filePath: string;
    sheetName: string;
    columnMapping: InventoryColumnMappingDto;
  };
}
