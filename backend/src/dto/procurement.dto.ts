import type { ProcurementRequestReason, ProcurementRequestStatus, PurchaseOrderStatus } from "@prisma/client";

// ---------- Suppliers ----------

export interface SupplierDto {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  active?: boolean;
}

export interface SupplierListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  active?: boolean;
}

export interface SupplierListResponseDto {
  items: SupplierDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Procurement Requests ----------

export interface ProcurementRequestDto {
  id: string;
  requestNumber: string;
  partId: string;
  partCode: string;
  partName: string;
  requestedQuantity: number;
  reason: ProcurementRequestReason;
  status: ProcurementRequestStatus;
  jobCardId: string | null;
  jobCardNumber: string | null;
  requestedById: string;
  requestedByName: string;
  approvedById: string | null;
  approvedByName: string | null;
  decidedAt: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface CreateProcurementRequestInput {
  partId: string;
  requestedQuantity: number;
  reason?: ProcurementRequestReason;
  jobCardId?: string;
  remarks?: string;
}

export interface DecideProcurementRequestInput {
  remarks?: string;
}

export interface ProcurementRequestListQueryDto {
  page: number;
  pageSize: number;
  status?: ProcurementRequestStatus;
  partId?: string;
}

export interface ProcurementRequestListResponseDto {
  items: ProcurementRequestDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Purchase Orders ----------

export interface PurchaseOrderLineDto {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  procurementRequestId: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: string;
  lineTotal: string;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalValue: string;
  createdById: string;
  createdByName: string;
  issuedAt: string | null;
  expectedDeliveryDate: string | null;
  remarks: string | null;
  createdAt: string;
  lines: PurchaseOrderLineDto[];
  receipts: PurchaseOrderReceiptDto[];
}

export interface CreatePurchaseOrderLineInput {
  partId: string;
  procurementRequestId?: string;
  orderedQuantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDeliveryDate?: string;
  remarks?: string;
  lines: CreatePurchaseOrderLineInput[];
}

export interface UpdatePurchaseOrderInput {
  expectedDeliveryDate?: string;
  remarks?: string;
  lines?: CreatePurchaseOrderLineInput[];
}

export interface PurchaseOrderListQueryDto {
  page: number;
  pageSize: number;
  status?: PurchaseOrderStatus;
  supplierId?: string;
}

export interface PurchaseOrderListResponseDto {
  items: PurchaseOrderDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** What a Purchase Order was received against - Inventory Upload is the sole receipt mechanism
 * (no separate GRN), so this is just a read-only summary of every upload tagged to this PO. */
export interface PurchaseOrderReceiptDto {
  uploadId: string;
  invoiceNumber: string;
  totalQuantityAdded: number;
  uploadedByName: string;
  uploadedAt: string;
}
