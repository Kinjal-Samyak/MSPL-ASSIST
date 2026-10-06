import type { OperationalSyncFrequency } from "../constants/operational-data.constants";

export interface MasterColumnMappingDto {
  customerName: string;
  phone: string;
  hub: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  plan: string;
  rentalStatus: string;
  deploymentDate: string;
  returnDate: string;
  coordinator: string;
}

export interface InventoryColumnMappingDto {
  mvTrackNumber: string;
  vehicleNumber: string;
  model: string;
  modelCode: string;
  status: string;
  hub: string;
  battery: string;
  iotDevice: string;
  vin: string;
  motorNumber: string;
  chassisNumber: string;
}

export interface OperationalDataSettingsDto {
  operationalDataFolder: string;
  masterWorkbook: string;
  masterWorkbookUrl?: string | null;
  masterWorksheet: string;
  inventoryWorkbook: string;
  inventoryWorkbookUrl?: string | null;
  inventoryWorksheet: string;
  relationshipMasterColumn?: string | null;
  relationshipInventoryColumn?: string | null;
  headerRow?: number;
  autoDetectedMappings?: Record<string, unknown> | null;
  manualMappings?: Record<string, unknown> | null;
  masterColumnMapping: MasterColumnMappingDto;
  inventoryColumnMapping: InventoryColumnMappingDto;
  autoSyncEnabled: boolean;
  syncFrequency: OperationalSyncFrequency;
  lastSyncTime: string | null;
  lastSuccessfulSync: string | null;
  lastValidation: string | null;
  lastSyncStatus: "SUCCESS" | "FAILED" | "IDLE" | null;
  lastSyncDuration: number | null;
  lastSyncRowsImported: number;
  lastSyncRowsUpdated: number;
  lastSyncRowsFailed: number;
  masterDeploymentLastModified: string | null;
  inventoryLastModified: string | null;
  workbookHash: string | null;
  worksheetHash: string | null;
  workbookStructureHash?: string | null;
  workbookVersion?: string | null;
  configurationVersion?: number | null;
  masterDriveId?: string | null;
  masterItemId?: string | null;
  inventoryDriveId?: string | null;
  inventoryItemId?: string | null;
  graphAuthConnected?: boolean;
  graphAuthTokenExpiresAt?: string | null;
  graphAuthLastError?: string | null;
  graphAuthUpdatedAt?: string | null;
}

export interface UpdateOperationalDataSettingsDto {
  operationalDataFolder: string;
  masterWorkbook: string;
  masterWorkbookUrl?: string;
  masterWorksheet: string;
  inventoryWorkbook: string;
  inventoryWorkbookUrl?: string;
  inventoryWorksheet: string;
  relationshipMasterColumn?: string;
  relationshipInventoryColumn?: string;
  headerRow?: number;
  autoDetectedMappings?: Record<string, unknown>;
  manualMappings?: Record<string, unknown>;
  masterColumnMapping: MasterColumnMappingDto;
  inventoryColumnMapping: InventoryColumnMappingDto;
  autoSyncEnabled: boolean;
  syncFrequency: OperationalSyncFrequency;
  masterDriveId?: string;
  masterItemId?: string;
  inventoryDriveId?: string;
  inventoryItemId?: string;
}

export interface OneDriveDriveDto {
  id: string;
  name: string;
  driveType: string;
  webUrl: string | null;
}

export interface OneDriveItemDto {
  id: string;
  name: string;
  type: "FOLDER" | "WORKBOOK";
  webUrl: string | null;
  lastModifiedDate: string | null;
  size: number | null;
}

export interface BrowseOneDriveItemsRequestDto {
  driveId: string;
  parentItemId?: string;
}

export interface BrowseOneDriveItemsResponseDto {
  driveId: string;
  parentItemId: string | null;
  items: OneDriveItemDto[];
}

export interface OperationalFolderScanRequestDto {
  folder: string;
}

export interface OperationalFolderScanResponseDto {
  files: string[];
}

export interface WorkbookWorksheetsRequestDto {
  folder: string;
  workbook: string;
}

export interface WorkbookWorksheetsResponseDto {
  worksheets: string[];
  autoSelectedWorksheet: string | null;
}

export interface ValidateOperationalDataRequestDto {
  operationalDataFolder: string;
  masterWorkbook: string;
  masterWorksheet?: string;
  inventoryWorkbook: string;
  inventoryWorksheet?: string;
  masterColumnMapping?: Partial<MasterColumnMappingDto>;
  inventoryColumnMapping?: Partial<InventoryColumnMappingDto>;
}

export interface ValidateOperationalDataResponseDto {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  resolvedMasterWorksheet: string;
  resolvedInventoryWorksheet: string;
  masterWorkbookHash: string;
  inventoryWorkbookHash: string;
}

export interface ValidateWorkbookUrlsRequestDto {
  masterWorkbookUrl?: string;
  inventoryWorkbookUrl?: string;
  masterDriveId?: string;
  masterItemId?: string;
  inventoryDriveId?: string;
  inventoryItemId?: string;
}

export interface WorkbookValidationMetadataDto {
  workbookUrl: string | null;
  workbookName: string;
  workbookSize: number;
  modifiedDate: string | null;
  worksheets: string[];
  autoSelectedWorksheet: string | null;
}

export interface ValidateWorkbookUrlsResponseDto {
  masterWorkbook: WorkbookValidationMetadataDto;
  inventoryWorkbook: WorkbookValidationMetadataDto;
}

export interface GraphAuthUrlResponseDto {
  authorizationUrl: string;
  state: string;
}

export interface GraphAuthExchangeRequestDto {
  code: string;
}

export interface GraphAuthStatusResponseDto {
  authenticated: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
  lastError: string | null;
}

export interface LoadWorkbookHeadersRequestDto {
  masterWorkbookUrl?: string;
  inventoryWorkbookUrl?: string;
  masterDriveId?: string;
  masterItemId?: string;
  inventoryDriveId?: string;
  inventoryItemId?: string;
  masterWorksheet: string;
  inventoryWorksheet: string;
  headerRow?: number;
}

export interface LoadWorkbookHeadersResponseDto {
  headerRow: number;
  masterHeaders: string[];
  inventoryHeaders: string[];
}

export interface MappingSuggestionDto {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
}

export interface RelationshipSuggestionDto {
  masterColumn: string;
  inventoryColumn: string;
  confidence: number;
}

export interface DetectMappingSuggestionsRequestDto {
  masterHeaders: string[];
  inventoryHeaders: string[];
}

export interface DetectMappingSuggestionsResponseDto {
  relationship: RelationshipSuggestionDto | null;
  suggestions: MappingSuggestionDto[];
}

export interface PreviewOperationalConfigurationRequestDto {
  masterWorkbookUrl?: string;
  inventoryWorkbookUrl?: string;
  masterDriveId?: string;
  masterItemId?: string;
  inventoryDriveId?: string;
  inventoryItemId?: string;
  masterWorksheet: string;
  inventoryWorksheet: string;
  relationshipMasterColumn: string;
  relationshipInventoryColumn: string;
  headerRow?: number;
}

export interface PreviewOperationalConfigurationResponseDto {
  masterWorkbookName: string;
  inventoryWorkbookName: string;
  masterWorksheet: string;
  inventoryWorksheet: string;
  headerCountMaster: number;
  headerCountInventory: number;
  relationshipMasterColumn: string;
  relationshipInventoryColumn: string;
  masterRows: number;
  inventoryRows: number;
  matchedRecordsEstimate: number;
  missingMasterKeys: number;
  missingInventoryKeys: number;
  duplicateMasterKeys: number;
  duplicateInventoryKeys: number;
  rowsRead: number;
  rowsValid: number;
  rowsInvalid: number;
  rowsInsert: number;
  rowsUpdate: number;
  rowsIgnore: number;
  relationshipFailures: number;
  validationErrors: number;
  columnMappingErrors: number;
  previewChanges: Array<{
    key: string;
    action: "INSERT" | "UPDATE" | "IGNORE";
  }>;
}

export interface SaveOperationalWizardConfigurationDto {
  masterWorkbookUrl?: string;
  inventoryWorkbookUrl?: string;
  masterWorksheet: string;
  inventoryWorksheet: string;
  relationshipMasterColumn: string;
  relationshipInventoryColumn: string;
  headerRow: number;
  autoDetectedMappings: Record<string, unknown>;
  manualMappings: Record<string, unknown>;
  masterColumnMapping: MasterColumnMappingDto;
  inventoryColumnMapping: InventoryColumnMappingDto;
  autoSyncEnabled: boolean;
  syncFrequency: OperationalSyncFrequency;
  masterDriveId?: string;
  masterItemId?: string;
  inventoryDriveId?: string;
  inventoryItemId?: string;
}

export interface SyncFileSystemMetadataDto {
  masterDeploymentFullPath: string;
  inventoryFullPath: string;
  masterDeploymentLastModified: string;
  inventoryLastModified: string;
  masterWorkbookHash: string;
  inventoryWorkbookHash: string;
  worksheetHash: string;
}
