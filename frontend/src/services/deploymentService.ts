import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { VehicleOperationalStatus } from './vehicleService';

export type RentalStatus = 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'MAINTENANCE';

export interface DeploymentDashboardResponse {
  totalDeployments: number;
  activeDeployments: number;
  pendingDeployments: number;
  completedDeployments: number;
  maintenanceDeployments: number;
  deploymentsWithOpenTickets: number;
}

export interface DeploymentListQuery {
  page: number;
  pageSize: number;
  search?: string;
  rentalStatus?: RentalStatus;
  hubName?: string;
  modelCode?: string;
  sortBy?:
    'updatedAt' | 'startedAt' | 'customerName' | 'vehicleNumber' | 'mvTrackNumber' | 'rentalStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface DeploymentListItem {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  modelName: string;
  modelCode: string | null;
  hubName: string;
  rentalStatus: RentalStatus;
  vehicleStatus: VehicleOperationalStatus | null;
  startedAt: string;
  updatedAt: string;
}

export interface DeploymentListResponse {
  items: DeploymentListItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentDetailResponse extends DeploymentListItem {
  vehicleVin: string | null;
  registrationNumber: string | null;
  batteryNumber: string | null;
  riderName: string;
  riderPhone: string;
  openTicketCount: number;
}

export interface DeploymentTimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface DeploymentTimelineResponse {
  items: DeploymentTimelineEvent[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentPaymentItem {
  paymentId: string;
  ticketId: string;
  ticketNumber: string;
  status: string;
  estimatedCharges: string | null;
  finalCharges: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface DeploymentPaymentsResponse {
  items: DeploymentPaymentItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentHistoryItem {
  id: string;
  ticketId: string;
  oldStatus: string | null;
  newStatus: string;
  remarks: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface DeploymentHistoryResponse {
  items: DeploymentHistoryItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentStatusResponse {
  deploymentId: string;
  rentalStatus: RentalStatus;
  latestTicketStatus: string | null;
  openTicketCount: number;
  canClose: boolean;
  canReopen: boolean;
  workflowStatuses: Array<{ code: string; label: string }>;
}

export interface DeploymentMutationResponse {
  deploymentId: string;
  rentalStatus: RentalStatus;
  updatedAt: string;
}

export const deploymentService = {
  async getDashboard(params?: Partial<DeploymentListQuery>): Promise<DeploymentDashboardResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentDashboardResponse>>(
      '/api/v1/deployments/dashboard',
      { params }
    );
    return unwrapApiData(response);
  },

  async getDeployments(params: DeploymentListQuery): Promise<DeploymentListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentListResponse>>(
      '/api/v1/deployments',
      { params }
    );
    return unwrapApiData(response);
  },

  async searchDeployments(params: DeploymentListQuery): Promise<DeploymentListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentListResponse>>(
      '/api/v1/deployments/search',
      { params }
    );
    return unwrapApiData(response);
  },

  async getDeploymentById(deploymentId: string): Promise<DeploymentDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentDetailResponse>>(
      `/api/v1/deployments/${deploymentId}`
    );
    return unwrapApiData(response);
  },

  async getTimeline(
    deploymentId: string,
    params: { page: number; pageSize: number }
  ): Promise<DeploymentTimelineResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentTimelineResponse>>(
      `/api/v1/deployments/${deploymentId}/timeline`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getPayments(
    deploymentId: string,
    params: { page: number; pageSize: number }
  ): Promise<DeploymentPaymentsResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentPaymentsResponse>>(
      `/api/v1/deployments/${deploymentId}/payments`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getHistory(
    deploymentId: string,
    params: { page: number; pageSize: number }
  ): Promise<DeploymentHistoryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentHistoryResponse>>(
      `/api/v1/deployments/${deploymentId}/history`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getStatus(deploymentId: string): Promise<DeploymentStatusResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DeploymentStatusResponse>>(
      `/api/v1/deployments/${deploymentId}/status`
    );
    return unwrapApiData(response);
  },

  async closeDeployment(deploymentId: string): Promise<DeploymentMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<DeploymentMutationResponse>>(
      `/api/v1/deployments/${deploymentId}/close`
    );
    return unwrapApiData(response);
  },

  async reopenDeployment(deploymentId: string): Promise<DeploymentMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<DeploymentMutationResponse>>(
      `/api/v1/deployments/${deploymentId}/reopen`
    );
    return unwrapApiData(response);
  },
};
