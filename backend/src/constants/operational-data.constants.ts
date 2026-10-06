export const OPERATIONAL_DATA_CATEGORY = "OPERATIONAL_DATA_CONFIGURATION";
export const OPERATIONAL_DATA_STATUS_CATEGORY = "OPERATIONAL_DATA_STATUS";

export const OPERATIONAL_DATA_SETTING_KEYS = {
  folder: "OPERATIONAL_DATA_FOLDER",
  masterWorkbook: "MASTER_WORKBOOK",
  masterWorkbookUrl: "MASTER_WORKBOOK_URL",
  masterWorksheet: "MASTER_WORKSHEET",
  inventoryWorkbook: "INVENTORY_WORKBOOK",
  inventoryWorkbookUrl: "INVENTORY_WORKBOOK_URL",
  inventoryWorksheet: "INVENTORY_WORKSHEET",
  relationshipMasterColumn: "RELATIONSHIP_MASTER_COLUMN",
  relationshipInventoryColumn: "RELATIONSHIP_INVENTORY_COLUMN",
  headerRow: "HEADER_ROW",
  autoDetectedMappings: "AUTO_DETECTED_MAPPINGS",
  manualMappings: "MANUAL_MAPPINGS",
  masterColumnMapping: "MASTER_COLUMN_MAPPING",
  inventoryColumnMapping: "INVENTORY_COLUMN_MAPPING",
  autoSyncEnabled: "AUTO_SYNC_ENABLED",
  syncInterval: "SYNC_INTERVAL",
  lastSyncTime: "LAST_SYNC_TIME",
  lastSuccessfulSync: "LAST_SUCCESSFUL_SYNC",
  lastValidation: "LAST_VALIDATION",
  lastSyncStatus: "LAST_SYNC_STATUS",
  lastSyncDuration: "LAST_SYNC_DURATION",
  lastSyncRowsImported: "LAST_SYNC_ROWS_IMPORTED",
  lastSyncRowsUpdated: "LAST_SYNC_ROWS_UPDATED",
  lastSyncRowsFailed: "LAST_SYNC_ROWS_FAILED",
  masterLastModified: "MASTER_DEPLOYMENT_LAST_MODIFIED",
  inventoryLastModified: "INVENTORY_LAST_MODIFIED",
  workbookHash: "WORKBOOK_HASH",
  worksheetHash: "WORKSHEET_HASH",
  workbookStructureHash: "WORKBOOK_STRUCTURE_HASH",
  workbookVersion: "WORKBOOK_VERSION",
  configurationVersion: "CONFIGURATION_VERSION",
  masterDriveId: "MASTER_DRIVE_ID",
  masterItemId: "MASTER_ITEM_ID",
  inventoryDriveId: "INVENTORY_DRIVE_ID",
  inventoryItemId: "INVENTORY_ITEM_ID",
  graphAuthState: "GRAPH_AUTH_STATE",
  graphAuthLastError: "GRAPH_AUTH_LAST_ERROR",
  graphAuthUpdatedAt: "GRAPH_AUTH_UPDATED_AT",
} as const;

export const OPERATIONAL_SYNC_FREQUENCIES = [
  "MANUAL",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "HOURLY",
  "DAILY",
] as const;

export type OperationalSyncFrequency = (typeof OPERATIONAL_SYNC_FREQUENCIES)[number];

export const OPERATIONAL_SYNC_HISTORY_LIMIT = 50;

export const SUPPORTED_EXCEL_EXTENSIONS = [".xlsx", ".xlsm", ".xls"] as const;
