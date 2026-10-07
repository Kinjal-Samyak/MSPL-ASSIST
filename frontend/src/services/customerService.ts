import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { UserRole } from '@mspl/shared-constants';

export interface CustomerSearchItem {
  customerId: string;
  customerName: string;
  mobileNumber: string;
  hub: string | null;
  activeDeploymentCount: number;
}

export interface CustomerSearchResponse {
  items: CustomerSearchItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerVehicleResponse {
  vehicleNumber: string;
  vehicleModel: string;
  batteryNumber: string;
  hub: string;
  deploymentDate: string;
  rentalStatus: string;
  planName?: string;
  contactName?: string;
  contactPhone?: string;
  vehicleName?: string;
  bookingId?: string;
}

export interface CustomerListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  viewerRole?: UserRole;
  viewerUserId?: string;
}

export interface CustomerListItem {
  customerId: string;
  customerName: string;
  registeredMobile: string;
  alternateMobile: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  activeDeploymentCount: number;
  openTicketCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<'ACTIVE' | 'INACTIVE' | 'SUSPENDED', number>;
}

export interface CustomerDetailResponse {
  customerId: string;
  customerName: string;
  registeredMobile: string;
  alternateMobile: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  activeDeploymentCount: number;
  totalDeploymentCount: number;
  openTicketCount: number;
  totalTicketCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMutationPayload {
  customerName?: string;
  registeredMobile?: string;
  alternateMobile?: string;
  whatsAppNumber?: string;
  email?: string;
  address?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface CustomerMutationResponse {
  customerId: string;
  customerName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  updatedAt: string;
}

export interface CustomerTimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface CustomerTimelineResponse {
  items: CustomerTimelineEvent[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerRentalHistoryItem {
  deploymentId: string;
  vehicleNumber: string;
  batteryNumber: string;
  vehicleModel: string;
  hub: string;
  rentalStatus: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'MAINTENANCE';
  deployedAt: string;
}

export interface CustomerRentalHistoryResponse {
  items: CustomerRentalHistoryItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerDocumentItem {
  documentId: string;
  ticketId: string;
  ticketNumber: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface CustomerDocumentResponse {
  items: CustomerDocumentItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const customerService = {
  async searchCustomers(params: {
    page: number;
    pageSize: number;
    search: string;
  }): Promise<CustomerSearchResponse> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerSearchResponse>>(
      '/api/v1/customers/search',
      { params }
    );
    return unwrapApiData(response);
  },

  async getCustomerVehicles(customerId: string): Promise<CustomerVehicleResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerVehicleResponse[]>>(
      `/api/v1/customers/${customerId}/vehicles`
    );
    return unwrapApiData(response);
  },

  async getCustomers(params: CustomerListQuery): Promise<CustomerListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerListResponse>>(
      '/api/v1/customers',
      {
        params,
      }
    );
    return unwrapApiData(response);
  },

  async getCustomerById(
    customerId: string,
    params?: {
      viewerRole?: UserRole;
      viewerUserId?: string;
    }
  ): Promise<CustomerDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerDetailResponse>>(
      `/api/v1/customers/${customerId}`,
      { params }
    );
    return unwrapApiData(response);
  },

  async createCustomer(
    payload: Required<Pick<CustomerMutationPayload, 'customerName' | 'registeredMobile'>> &
      CustomerMutationPayload
  ): Promise<CustomerMutationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<CustomerMutationResponse>>(
      '/api/v1/customers',
      payload
    );
    return unwrapApiData(response);
  },

  async updateCustomer(
    customerId: string,
    payload: CustomerMutationPayload
  ): Promise<CustomerMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<CustomerMutationResponse>>(
      `/api/v1/customers/${customerId}`,
      payload
    );
    return unwrapApiData(response);
  },

  async deactivateCustomer(customerId: string, reason: string): Promise<CustomerMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<CustomerMutationResponse>>(
      `/api/v1/customers/${customerId}/deactivate`,
      { reason }
    );
    return unwrapApiData(response);
  },

  async getCustomerTimeline(
    customerId: string,
    params: {
      page: number;
      pageSize: number;
    }
  ): Promise<CustomerTimelineResponse> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerTimelineResponse>>(
      `/api/v1/customers/${customerId}/timeline`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getCustomerRentalHistory(
    customerId: string,
    params: {
      page: number;
      pageSize: number;
      rentalStatus?: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'MAINTENANCE';
      hub?: string;
      search?: string;
    }
  ): Promise<CustomerRentalHistoryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerRentalHistoryResponse>>(
      `/api/v1/customers/${customerId}/rental-history`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getCustomerActiveVehicles(customerId: string): Promise<CustomerRentalHistoryItem[]> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerRentalHistoryItem[]>>(
      `/api/v1/customers/${customerId}/active-vehicles`
    );
    return unwrapApiData(response);
  },

  async getCustomerDocuments(
    customerId: string,
    params: {
      page: number;
      pageSize: number;
      fileType?: string;
    }
  ): Promise<CustomerDocumentResponse> {
    const response = await apiClient.get<ApiSuccessResponse<CustomerDocumentResponse>>(
      `/api/v1/customers/${customerId}/documents`,
      { params }
    );
    return unwrapApiData(response);
  },
};
