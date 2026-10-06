import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface PartCategory {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
}
export interface PartCompatibility {
  modelCode: string;
  modelName: string;
}
export interface Part {
  id: string;
  partCode: string;
  partName: string;
  description: string | null;
  category: PartCategory;
  subcategory: { id: string; name: string } | null;
  unitOfMeasure: string;
  partCost: string;
  warrantyEligible: boolean;
  consumable: boolean;
  minimumStock: number;
  reorderLevel: number;
  maximumStock: number | null;
  active: boolean;
  remarks: string | null;
  compatibleModels: PartCompatibility[];
  availableQuantity: number;
}
export interface PartsImportIssue {
  rowNumber: number;
  column?: string;
  reason: string;
}
export interface PartsCatalogImportPreview {
  sessionId: string;
  templateType: 'CATALOG';
  templateVersion: string | null;
  recordsParsed: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warnings: PartsImportIssue[];
  errors: PartsImportIssue[];
  previewData: Array<Record<string, unknown>>;
}
export interface PartsCatalogImportSummary {
  sessionId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  newPartsCreated: number;
  existingPartsUpdated: number;
  warnings: PartsImportIssue[];
  errors: PartsImportIssue[];
  processingDurationMs: number;
}
export interface PartsInventoryImportPreview {
  sessionId: string;
  templateType: 'INVENTORY';
  templateVersion: string | null;
  recordsParsed: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warnings: PartsImportIssue[];
  errors: PartsImportIssue[];
  previewData: Array<Record<string, unknown>>;
}
export interface PartsInventoryImportSummary {
  sessionId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  partsCreated: number;
  partsUpdated: number;
  totalQuantityAdded: number;
  warnings: PartsImportIssue[];
  errors: PartsImportIssue[];
  processingDurationMs: number;
}
export interface PartsImportTemplate {
  type: 'CATALOG' | 'INVENTORY';
  templateVersion: string;
  headers: string[];
  fileName: string;
  workbookBase64: string;
}

export type PartTransactionType =
  | 'RECEIPT'
  | 'ISSUE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'WARRANTY_RETURN'
  | 'SCRAP';

export interface PartInventoryTransaction {
  id: string;
  transactionType: PartTransactionType;
  quantityDelta: number;
  balanceAfter: number;
  partId: string;
  partCode: string;
  partName: string;
  hubId: string | null;
  hubName: string | null;
  vehicleModelId: string | null;
  vehicleModelName: string | null;
  technicianId: string | null;
  technicianName: string | null;
  jobCardId: string | null;
  jobCardNumber: string | null;
  ticketId: string | null;
  ticketNumber: string | null;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: string | null;
  totalValue: string | null;
  reason: string | null;
  performedById: string;
  performedByName: string;
  transactionMonth: string;
  createdAt: string;
}

export interface PartInventoryTransactionListQuery {
  page: number;
  pageSize: number;
  partId?: string;
  transactionType?: PartTransactionType;
  hubId?: string;
  technicianId?: string;
  jobCardId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PartInventoryTransactionListResponse {
  items: PartInventoryTransaction[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export type ConsumptionGroupBy =
  'MONTH' | 'HUB' | 'VEHICLE_MODEL' | 'TECHNICIAN' | 'PART' | 'JOB_CARD';

export interface ConsumptionSummaryPoint {
  key: string;
  label: string;
  quantity: number;
  value: number;
}

export interface CreatePartAdjustmentPayload {
  quantityDelta: number;
  reason: string;
  hubId?: string;
}

export interface PartAdjustmentResult {
  partId: string;
  availableQuantity: number;
  transactionId: string;
}

export interface PartsInventoryUpload {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  partsCreated: number;
  partsUpdated: number;
  totalQuantityAdded: number;
  totalValue: string;
  invoiceNumber: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface PartsInventoryUploadListQuery {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PartsInventoryUploadListResponse {
  items: PartsInventoryUpload[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export const partsService = {
  async listCategories(): Promise<PartCategory[]> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<PartCategory[]>>('/api/v1/parts/categories')
    );
  },
  async listCatalog(params?: {
    search?: string;
    categoryId?: string;
    active?: boolean;
  }): Promise<Part[]> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<Part[]>>('/api/v1/parts/catalog', { params })
    );
  },
  async previewCatalogImport(workbookBase64: string): Promise<PartsCatalogImportPreview> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PartsCatalogImportPreview>>(
        '/api/v1/parts/import/catalog/preview',
        { workbookBase64 }
      )
    );
  },
  async confirmCatalogImport(sessionId: string): Promise<PartsCatalogImportSummary> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PartsCatalogImportSummary>>(
        '/api/v1/parts/import/catalog/confirm',
        { sessionId }
      )
    );
  },
  async previewInventoryImport(
    workbookBase64: string,
    fileName: string
  ): Promise<PartsInventoryImportPreview> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PartsInventoryImportPreview>>(
        '/api/v1/parts/import/inventory/preview',
        { workbookBase64, fileName }
      )
    );
  },
  async confirmInventoryImport(
    sessionId: string,
    invoiceNumber: string,
    purchaseOrderId?: string
  ): Promise<PartsInventoryImportSummary> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PartsInventoryImportSummary>>(
        '/api/v1/parts/import/inventory/confirm',
        { sessionId, invoiceNumber, purchaseOrderId }
      )
    );
  },
  async getImportTemplates(): Promise<PartsImportTemplate[]> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<PartsImportTemplate[]>>(
        '/api/v1/parts/import/templates'
      )
    );
  },
  async updatePartCategory(
    id: string,
    payload: { categoryId: string; compatibleModels: PartCompatibility[] }
  ): Promise<Part> {
    return unwrapApiData(
      await apiClient.put<ApiSuccessResponse<Part>>(`/api/v1/parts/catalog/${id}/category`, payload)
    );
  },
  async createAdjustment(
    id: string,
    payload: CreatePartAdjustmentPayload
  ): Promise<PartAdjustmentResult> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PartAdjustmentResult>>(
        `/api/v1/parts/catalog/${id}/adjustments`,
        payload
      )
    );
  },
  async listTransactions(
    params: PartInventoryTransactionListQuery
  ): Promise<PartInventoryTransactionListResponse> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<PartInventoryTransactionListResponse>>(
        '/api/v1/parts/inventory/transactions',
        { params }
      )
    );
  },
  async getConsumptionSummary(
    groupBy: ConsumptionGroupBy,
    params?: { dateFrom?: string; dateTo?: string; hubId?: string }
  ): Promise<ConsumptionSummaryPoint[]> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<ConsumptionSummaryPoint[]>>(
        '/api/v1/parts/inventory/consumption-summary',
        { params: { groupBy, ...params } }
      )
    );
  },
  async listUploadHistory(
    params: PartsInventoryUploadListQuery
  ): Promise<PartsInventoryUploadListResponse> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<PartsInventoryUploadListResponse>>(
        '/api/v1/parts/import/inventory/history',
        { params }
      )
    );
  },
  async downloadUpload(id: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/parts/import/inventory/history/${id}/download`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
