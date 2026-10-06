export interface PartCompatibilityDto {
  modelCode: string;
  modelName: string;
}

export interface CreatePartCategoryDto {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface CreatePartSubcategoryDto {
  categoryId: string;
  name: string;
  description?: string;
}

export interface CreatePartDto {
  partCode: string;
  partName: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string;
  brand?: string;
  manufacturer?: string;
  oemPartNumber?: string;
  internalPartNumber?: string;
  unitOfMeasure: string;
  partCost: number;
  warrantyEligible?: boolean;
  consumable?: boolean;
  minimumStock?: number;
  reorderLevel?: number;
  maximumStock?: number;
  active?: boolean;
  remarks?: string;
  compatibleModels: PartCompatibilityDto[];
}

export interface UpdatePartCategoryDto {
  categoryId: string;
  compatibleModels: PartCompatibilityDto[];
}

export interface PartListQueryDto { search?: string; categoryId?: string; active?: boolean; }

export interface CreatePartAdjustmentDto {
  quantityDelta: number;
  reason: string;
  hubId?: string;
}

export interface PartAdjustmentResultDto {
  partId: string;
  availableQuantity: number;
  transactionId: string;
}

export type PartTransactionTypeName =
  | "RECEIPT"
  | "ISSUE"
  | "RETURN"
  | "ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "WARRANTY_RETURN"
  | "SCRAP";

export interface PartInventoryTransactionListQueryDto {
  page: number;
  pageSize: number;
  partId?: string;
  transactionType?: PartTransactionTypeName;
  hubId?: string;
  technicianId?: string;
  jobCardId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type ConsumptionGroupBy = "MONTH" | "HUB" | "VEHICLE_MODEL" | "TECHNICIAN" | "PART" | "JOB_CARD";

export interface ConsumptionSummaryQueryDto {
  groupBy: ConsumptionGroupBy;
  dateFrom?: string;
  dateTo?: string;
  hubId?: string;
}

export interface ConsumptionSummaryPointDto {
  key: string;
  label: string;
  quantity: number;
  value: number;
}

export interface PartInventoryTransactionResponseDto {
  id: string;
  transactionType: PartTransactionTypeName;
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

export interface PartInventoryTransactionListResponseDto {
  items: PartInventoryTransactionResponseDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export interface PartsInventoryUploadResponseDto {
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

export interface PartsInventoryUploadListQueryDto {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PartsInventoryUploadListResponseDto {
  items: PartsInventoryUploadResponseDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export interface PartCategoryResponseDto { id: string; name: string; description: string | null; displayOrder: number; active: boolean; }
export interface PartResponseDto {
  id: string; partCode: string; partName: string; description: string | null; category: PartCategoryResponseDto;
  subcategory: { id: string; name: string } | null; unitOfMeasure: string; partCost: string;
  warrantyEligible: boolean; consumable: boolean; minimumStock: number; reorderLevel: number; maximumStock: number | null;
  active: boolean; remarks: string | null; compatibleModels: PartCompatibilityDto[]; availableQuantity: number;
}
