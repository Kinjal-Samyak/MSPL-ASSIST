import type { ExcelSyncEngineResultDto } from "./excel-sync.dto";

export type SyncRunStatus = "SUCCESS" | "FAILED" | "RUNNING" | "IDLE";
export type SyncRunTrigger = "MANUAL" | "SCHEDULER";

export interface SyncRunSummaryDto {
  startTime: string;
  endTime: string;
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  executionTimeMs: number;
  status: SyncRunStatus;
  trigger: SyncRunTrigger;
  operationalMetrics?: {
    masterDeploymentRowsRead: number;
    uniqueMotorNoFound: number;
    blankMasterMotorNo: number;
    duplicateMasterMotorNo: number;
    inventoryRows: number;
    distinctInventoryMotorNo: number;
    blankInventoryMotorNo: number;
    motorNoSuccessfullyMatched: number;
    missingMotorNo: number;
    duplicateInventoryMotorNo: number;
    snapshotsCreated: number;
  };
}

export interface SyncStatusDto {
  lastSync: string | null;
  nextSync: string | null;
  durationMs: number | null;
  rowsProcessed: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
  rowsFailed: number;
  currentStatus: SyncRunStatus;
  operationalDataFolder?: string;
  masterWorkbook?: string;
  masterWorksheet?: string;
  inventoryWorkbook?: string;
  inventoryWorksheet?: string;
  schedulerMode?: "MANUAL" | "FIVE_MINUTES" | "FIFTEEN_MINUTES" | "THIRTY_MINUTES" | "HOURLY" | "DAILY";
  errors?: string[];
}

export interface SyncHistoryQueryDto {
  limit: number;
}

export interface PersistedSyncRunDto {
  id: string;
  summary: SyncRunSummaryDto;
  rawEngineResult: ExcelSyncEngineResultDto;
  audit?: {
    syncNumber: number;
    workbookVersion: string | null;
    schemaVersion: string | null;
    failureReason: string | null;
    exception: string | null;
    stackTrace: string | null;
    machine: string;
    user: string;
    detectedAt: string;
  };
}
