import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

// ---------- Suppliers ----------

export interface Supplier {
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

export interface CreateSupplierPayload {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload> & { active?: boolean };

export interface SupplierListResponse {
  items: Supplier[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Procurement Requests ----------

export type ProcurementRequestReason = 'LOW_STOCK' | 'JOB_CARD_SHORTAGE' | 'MANUAL';
export type ProcurementRequestStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | 'CLOSED';

export interface ProcurementRequest {
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

export interface CreateProcurementRequestPayload {
  partId: string;
  requestedQuantity: number;
  reason?: ProcurementRequestReason;
  jobCardId?: string;
  remarks?: string;
}

export interface ProcurementRequestListResponse {
  items: ProcurementRequest[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Purchase Orders ----------

export type PurchaseOrderStatus =
  'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderLine {
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

/** What this PO was received against - Inventory Upload is the sole receipt mechanism (no
 * separate GRN), so this is a read-only summary of every upload tagged to this PO. */
export interface PurchaseOrderReceipt {
  uploadId: string;
  invoiceNumber: string;
  totalQuantityAdded: number;
  uploadedByName: string;
  uploadedAt: string;
}

export interface PurchaseOrder {
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
  lines: PurchaseOrderLine[];
  receipts: PurchaseOrderReceipt[];
}

export interface PurchaseOrderLineInput {
  partId: string;
  procurementRequestId?: string;
  orderedQuantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  expectedDeliveryDate?: string;
  remarks?: string;
  lines: PurchaseOrderLineInput[];
}

export interface UpdatePurchaseOrderPayload {
  expectedDeliveryDate?: string;
  remarks?: string;
  lines?: PurchaseOrderLineInput[];
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrder[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const procurementService = {
  // Suppliers
  async listSuppliers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    active?: boolean;
  }): Promise<SupplierListResponse> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<SupplierListResponse>>(
        '/api/v1/procurement/suppliers',
        { params }
      )
    );
  },
  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<Supplier>>('/api/v1/procurement/suppliers', payload)
    );
  },
  async updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
    return unwrapApiData(
      await apiClient.patch<ApiSuccessResponse<Supplier>>(
        `/api/v1/procurement/suppliers/${id}`,
        payload
      )
    );
  },

  // Procurement Requests
  async listProcurementRequests(params?: {
    page?: number;
    pageSize?: number;
    status?: ProcurementRequestStatus;
    partId?: string;
  }): Promise<ProcurementRequestListResponse> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<ProcurementRequestListResponse>>(
        '/api/v1/procurement/requests',
        { params }
      )
    );
  },
  async createProcurementRequest(
    payload: CreateProcurementRequestPayload
  ): Promise<ProcurementRequest> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<ProcurementRequest>>(
        '/api/v1/procurement/requests',
        payload
      )
    );
  },
  async approveProcurementRequest(
    id: string,
    payload?: { remarks?: string }
  ): Promise<ProcurementRequest> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<ProcurementRequest>>(
        `/api/v1/procurement/requests/${id}/approve`,
        payload ?? {}
      )
    );
  },
  async rejectProcurementRequest(
    id: string,
    payload?: { remarks?: string }
  ): Promise<ProcurementRequest> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<ProcurementRequest>>(
        `/api/v1/procurement/requests/${id}/reject`,
        payload ?? {}
      )
    );
  },

  // Purchase Orders
  async listPurchaseOrders(params?: {
    page?: number;
    pageSize?: number;
    status?: PurchaseOrderStatus;
    supplierId?: string;
  }): Promise<PurchaseOrderListResponse> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<PurchaseOrderListResponse>>(
        '/api/v1/procurement/purchase-orders',
        { params }
      )
    );
  },
  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<PurchaseOrder>>(
        `/api/v1/procurement/purchase-orders/${id}`
      )
    );
  },
  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PurchaseOrder>>(
        '/api/v1/procurement/purchase-orders',
        payload
      )
    );
  },
  async updatePurchaseOrder(
    id: string,
    payload: UpdatePurchaseOrderPayload
  ): Promise<PurchaseOrder> {
    return unwrapApiData(
      await apiClient.patch<ApiSuccessResponse<PurchaseOrder>>(
        `/api/v1/procurement/purchase-orders/${id}`,
        payload
      )
    );
  },
  async issuePurchaseOrder(id: string): Promise<PurchaseOrder> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PurchaseOrder>>(
        `/api/v1/procurement/purchase-orders/${id}/issue`,
        {}
      )
    );
  },
  async cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<PurchaseOrder>>(
        `/api/v1/procurement/purchase-orders/${id}/cancel`,
        {}
      )
    );
  },
  async downloadPurchaseOrderPdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/procurement/purchase-orders/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
