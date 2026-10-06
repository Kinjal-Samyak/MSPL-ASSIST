import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import { useAuthStore } from '@/store';
import type { ApiSuccessResponse } from '@/types/api.types';

export type SyncFrequency =
  'MANUAL' | 'FIVE_MINUTES' | 'FIFTEEN_MINUTES' | 'THIRTY_MINUTES' | 'HOURLY' | 'DAILY';

export interface MasterColumnMapping {
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

export interface InventoryColumnMapping {
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

export interface OperationalDataSettings {
  operationalDataFolder: string;
  masterWorkbook: string;
  masterWorkbookUrl?: string | null;
  masterDriveId?: string | null;
  masterItemId?: string | null;
  masterWorksheet: string;
  inventoryWorkbook: string;
  inventoryWorkbookUrl?: string | null;
  inventoryDriveId?: string | null;
  inventoryItemId?: string | null;
  inventoryWorksheet: string;
  relationshipMasterColumn?: string | null;
  relationshipInventoryColumn?: string | null;
  headerRow?: number;
  autoDetectedMappings?: Record<string, unknown> | null;
  manualMappings?: Record<string, unknown> | null;
  masterColumnMapping: MasterColumnMapping;
  inventoryColumnMapping: InventoryColumnMapping;
  autoSyncEnabled: boolean;
  syncFrequency: SyncFrequency;
  lastSyncTime: string | null;
  lastSuccessfulSync: string | null;
  lastValidation: string | null;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'IDLE' | null;
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
}

export type OperationalConfigurationDraft = Partial<
  Pick<
    OperationalDataSettings,
    | 'masterWorkbook'
    | 'masterWorkbookUrl'
    | 'masterDriveId'
    | 'masterItemId'
    | 'masterWorksheet'
    | 'inventoryWorkbook'
    | 'inventoryWorkbookUrl'
    | 'inventoryDriveId'
    | 'inventoryItemId'
    | 'inventoryWorksheet'
    | 'relationshipMasterColumn'
    | 'relationshipInventoryColumn'
    | 'autoSyncEnabled'
    | 'syncFrequency'
  >
>;

export interface OperationalDataValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  resolvedMasterWorksheet: string;
  resolvedInventoryWorksheet: string;
  masterWorkbookHash: string;
  inventoryWorkbookHash: string;
}

export interface FolderScanResponse {
  files: string[];
}

export interface LoadWorksheetsResponse {
  worksheets: string[];
  autoSelectedWorksheet: string | null;
}

export interface WorkbookValidationMetadata {
  workbookUrl: string | null;
  workbookName: string;
  workbookSize: number;
  modifiedDate: string | null;
  worksheets: string[];
  autoSelectedWorksheet: string | null;
}

export interface WorkbookValidationResponse {
  masterWorkbook: WorkbookValidationMetadata;
  inventoryWorkbook: WorkbookValidationMetadata;
}

export interface GraphAuthUrlResponse {
  authorizationUrl: string;
  state: string;
}

export interface GraphAuthStatusResponse {
  authenticated: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
  lastError: string | null;
}

export interface OneDriveDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string | null;
}

export interface OneDriveItem {
  id: string;
  name: string;
  type: 'FOLDER' | 'WORKBOOK';
  webUrl: string | null;
  lastModifiedDate: string | null;
  size: number | null;
}

export interface BrowseOneDriveItemsResponse {
  driveId: string;
  parentItemId: string | null;
  items: OneDriveItem[];
}

export interface WorkbookHeadersResponse {
  headerRow: number;
  masterHeaders: string[];
  inventoryHeaders: string[];
}

export interface MappingSuggestion {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
}

export interface MappingSuggestionResponse {
  relationship: {
    masterColumn: string;
    inventoryColumn: string;
    confidence: number;
  } | null;
  suggestions: MappingSuggestion[];
}

export interface ConfigurationPreviewResponse {
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
    action: 'INSERT' | 'UPDATE' | 'IGNORE';
  }>;
}

export interface WizardSavePayload {
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
  headerRow: number;
  autoDetectedMappings: Record<string, unknown>;
  manualMappings: Record<string, unknown>;
  masterColumnMapping: MasterColumnMapping;
  inventoryColumnMapping: InventoryColumnMapping;
  autoSyncEnabled: boolean;
  syncFrequency: SyncFrequency;
}

export interface UpdateOperationalDataPayload {
  operationalDataFolder: string;
  masterWorkbook: string;
  masterWorksheet: string;
  inventoryWorkbook: string;
  inventoryWorksheet: string;
  masterColumnMapping: MasterColumnMapping;
  inventoryColumnMapping: InventoryColumnMapping;
  autoSyncEnabled: boolean;
  syncFrequency: SyncFrequency;
}

export interface SyncRunSummary {
  startTime: string;
  endTime: string;
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  executionTimeMs: number;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'IDLE';
  trigger: 'MANUAL' | 'SCHEDULER';
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

export interface PersistedSyncRun {
  id: string;
  summary: SyncRunSummary;
  audit?: {
    failureReason: string | null;
  };
}

const WORKBOOK_GRAPH_TIMEOUT_MS = 120000;
const WORKBOOK_SAVE_TIMEOUT_MS = 180000;

function getRoleHeaders() {
  const role = useAuthStore.getState().user?.role;
  return role ? { 'x-user-role': role } : undefined;
}

export const operationalDataService = {
  async getSettings(): Promise<OperationalDataSettings> {
    const response = await apiClient.get<ApiSuccessResponse<OperationalDataSettings>>(
      '/api/v1/settings/operational-data',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async validateWorkbookUrls(payload: {
    masterWorkbookUrl?: string;
    inventoryWorkbookUrl?: string;
    masterDriveId?: string;
    masterItemId?: string;
    inventoryDriveId?: string;
    inventoryItemId?: string;
  }): Promise<WorkbookValidationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<WorkbookValidationResponse>>(
      '/api/v1/settings/operational-data/wizard/validate-workbooks',
      payload,
      { headers: getRoleHeaders(), timeout: WORKBOOK_GRAPH_TIMEOUT_MS }
    );
    return unwrapApiData(response);
  },

  async getGraphAuthUrl(): Promise<GraphAuthUrlResponse> {
    const response = await apiClient.get<ApiSuccessResponse<GraphAuthUrlResponse>>(
      '/api/v1/settings/operational-data/wizard/auth/url',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getGraphAuthStatus(): Promise<GraphAuthStatusResponse> {
    const response = await apiClient.get<ApiSuccessResponse<GraphAuthStatusResponse>>(
      '/api/v1/settings/operational-data/wizard/auth/status',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getOneDriveDrives(): Promise<OneDriveDrive[]> {
    const response = await apiClient.get<ApiSuccessResponse<OneDriveDrive[]>>(
      '/api/v1/settings/operational-data/wizard/onedrive/drives',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async browseOneDriveItems(
    driveId: string,
    parentItemId?: string
  ): Promise<BrowseOneDriveItemsResponse> {
    const response = await apiClient.get<ApiSuccessResponse<BrowseOneDriveItemsResponse>>(
      '/api/v1/settings/operational-data/wizard/onedrive/items',
      {
        params: { driveId, parentItemId },
        headers: getRoleHeaders(),
      }
    );
    return unwrapApiData(response);
  },

  async exchangeGraphAuthCode(code: string): Promise<GraphAuthStatusResponse> {
    const response = await apiClient.post<ApiSuccessResponse<GraphAuthStatusResponse>>(
      '/api/v1/settings/operational-data/wizard/auth/exchange',
      { code },
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async loadWorkbookHeaders(payload: {
    masterWorkbookUrl?: string;
    inventoryWorkbookUrl?: string;
    masterDriveId?: string;
    masterItemId?: string;
    inventoryDriveId?: string;
    inventoryItemId?: string;
    masterWorksheet: string;
    inventoryWorksheet: string;
    headerRow?: number;
  }): Promise<WorkbookHeadersResponse> {
    const response = await apiClient.post<ApiSuccessResponse<WorkbookHeadersResponse>>(
      '/api/v1/settings/operational-data/wizard/load-headers',
      payload,
      { headers: getRoleHeaders(), timeout: WORKBOOK_GRAPH_TIMEOUT_MS }
    );
    return unwrapApiData(response);
  },

  async detectMappings(
    masterHeaders: string[],
    inventoryHeaders: string[]
  ): Promise<MappingSuggestionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<MappingSuggestionResponse>>(
      '/api/v1/settings/operational-data/wizard/detect-mappings',
      { masterHeaders, inventoryHeaders },
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async previewConfiguration(payload: {
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
  }): Promise<ConfigurationPreviewResponse> {
    const response = await apiClient.post<ApiSuccessResponse<ConfigurationPreviewResponse>>(
      '/api/v1/settings/operational-data/wizard/preview',
      payload,
      { headers: getRoleHeaders(), timeout: WORKBOOK_GRAPH_TIMEOUT_MS }
    );
    return unwrapApiData(response);
  },

  async saveWizardConfiguration(payload: WizardSavePayload): Promise<OperationalDataSettings> {
    const response = await apiClient.post<ApiSuccessResponse<OperationalDataSettings>>(
      '/api/v1/settings/operational-data/wizard/configuration',
      payload,
      { headers: getRoleHeaders(), timeout: WORKBOOK_SAVE_TIMEOUT_MS }
    );
    return unwrapApiData(response);
  },

  async saveConfigurationDraft(
    payload: OperationalConfigurationDraft
  ): Promise<OperationalDataSettings> {
    const response = await apiClient.patch<ApiSuccessResponse<OperationalDataSettings>>(
      '/api/v1/settings/operational-data/draft',
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async scanFolder(folder: string): Promise<FolderScanResponse> {
    const response = await apiClient.post<ApiSuccessResponse<FolderScanResponse>>(
      '/api/v1/settings/operational-data/scan-folder',
      { folder },
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async loadWorksheets(folder: string, workbook: string): Promise<LoadWorksheetsResponse> {
    const response = await apiClient.post<ApiSuccessResponse<LoadWorksheetsResponse>>(
      '/api/v1/settings/operational-data/load-worksheets',
      { folder, workbook },
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async validate(
    payload: Partial<UpdateOperationalDataPayload> & {
      operationalDataFolder: string;
      masterWorkbook: string;
      inventoryWorkbook: string;
    }
  ): Promise<OperationalDataValidationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<OperationalDataValidationResponse>>(
      '/api/v1/settings/operational-data/validate',
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async save(payload: UpdateOperationalDataPayload): Promise<OperationalDataSettings> {
    const response = await apiClient.put<ApiSuccessResponse<OperationalDataSettings>>(
      '/api/v1/settings/operational-data',
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async runSyncNow(): Promise<SyncRunSummary> {
    const response = await apiClient.post<ApiSuccessResponse<SyncRunSummary>>(
      '/api/v1/sync/run',
      undefined,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getSyncHistory(limit = 5): Promise<PersistedSyncRun[]> {
    const response = await apiClient.get<ApiSuccessResponse<PersistedSyncRun[]>>(
      '/api/v1/sync/history',
      {
        params: { limit },
        headers: getRoleHeaders(),
      }
    );
    return unwrapApiData(response);
  },
};
