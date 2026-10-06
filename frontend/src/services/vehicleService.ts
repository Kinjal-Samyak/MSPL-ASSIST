import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export type VehicleOperationalStatus =
  'AVAILABLE' | 'DEPLOYED' | 'WORKSHOP' | 'RESERVED' | 'MAINTENANCE' | 'INACTIVE' | 'UNKNOWN';

export interface VehicleDashboardResponse {
  totalVehicles: number;
  availableVehicles: number;
  deployedVehicles: number;
  maintenanceVehicles: number;
  workshopVehicles: number;
  reservedVehicles: number;
  inactiveVehicles: number;
  revenueFleet: number;
  readyForDeployment: number;
  downFleet: number;
  inventoryHold: number;
  fleetUtilizationPercent: number;
  availabilityPercent: number;
  averageDowntimeHours: number;
  mttrHours: number;
  vehiclesReadyToday: number;
  waitingForSpare: number;
  repairInProgress: number;
  qualityCheck: number;
  vehiclesAgingOver72Hours: number;
  readyForDeploymentBreakdown: {
    fromInventory: number;
    fromService: number;
    deployableToday: number;
  };
  downFleetBreakdown: {
    inspection: number;
    waitingForSpare: number;
    workInProgress: number;
    readyForDeployment: number;
  };
  fleetHealth: {
    score: number;
    label: 'Excellent' | 'Good' | 'Attention' | 'Critical';
  };
  inventoryHoldBreakdown: {
    registrationPending: number;
    insurancePending: number;
    pdiPending: number;
  };
}

export interface VehicleListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: VehicleOperationalStatus;
  hubName?: string;
  modelCode?: string;
  sortBy?: 'updatedAt' | 'vehicleNumber' | 'mvTrackNumber' | 'status' | 'hubName';
  sortOrder?: 'asc' | 'desc';
}

export interface VehicleListItem {
  vehicleId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  modelName: string | null;
  modelCode: string | null;
  hubName: string | null;
  status: VehicleOperationalStatus;
  currentRiderName: string | null;
  updatedAt: string;
}

export interface VehicleListResponse {
  items: VehicleListItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleDetailResponse {
  vehicleId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  vin: string | null;
  chassisNumber: string | null;
  motorNumber: string | null;
  batteryNumber: string | null;
  modelName: string | null;
  modelCode: string | null;
  color: string | null;
  hubName: string | null;
  status: VehicleOperationalStatus;
  fdd: string | null;
  currentRiderName: string | null;
  currentRiderPhone: string | null;
  iotImei: string | null;
  iotSimNumber: string | null;
  warrantyExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  registrationExpiryDate: string | null;
  fitnessExpiryDate: string | null;
  pucExpiryDate: string | null;
  updatedAt: string;
}

export interface VehicleTimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface VehicleTimelineResponse {
  items: VehicleTimelineEvent[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleDeploymentHistoryItem {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  hubId: string;
  hubName: string;
  modelName: string;
  rentalStatus: string;
  startedAt: string;
  updatedAt: string;
}

export interface VehicleDeploymentHistoryResponse {
  items: VehicleDeploymentHistoryItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleCurrentDeployment {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  hubId: string;
  hubName: string;
  modelName: string;
  rentalStatus: string;
  startedAt: string;
  updatedAt: string;
}

export interface VehicleServiceHistoryItem {
  ticketId: string;
  ticketNumber: string;
  issueCategory: string;
  status: string;
  issueDescription: string;
  servicedAt: string;
}

export interface VehicleServiceHistoryResponse {
  items: VehicleServiceHistoryItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleDocumentItem {
  documentId: string;
  ticketId: string;
  ticketNumber: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface VehicleDocumentResponse {
  items: VehicleDocumentItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleStatusSummaryResponse {
  vehicleId: string;
  status: VehicleOperationalStatus;
  hasActiveDeployment: boolean;
  openTicketCount: number;
  latestServiceAt: string | null;
}

export interface VehicleHealthSummaryResponse {
  vehicleId: string;
  status: VehicleOperationalStatus;
  warrantyValid: boolean;
  insuranceValid: boolean;
  registrationValid: boolean;
  fitnessValid: boolean;
  pucValid: boolean;
  hasIotConnectivity: boolean;
}

export interface VehicleMutationResponse {
  vehicleId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  status: VehicleOperationalStatus;
  updatedAt: string;
}

export const vehicleService = {
  async getDashboard(params?: Partial<VehicleListQuery>): Promise<VehicleDashboardResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleDashboardResponse>>(
      '/api/v1/vehicles/dashboard',
      { params }
    );
    return unwrapApiData(response);
  },

  async getVehicles(params: VehicleListQuery): Promise<VehicleListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleListResponse>>(
      '/api/v1/vehicles',
      { params }
    );
    return unwrapApiData(response);
  },

  async searchVehicles(params: VehicleListQuery): Promise<VehicleListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleListResponse>>(
      '/api/v1/vehicles/search',
      {
        params,
      }
    );
    return unwrapApiData(response);
  },

  async getVehicleById(vehicleId: string): Promise<VehicleDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleDetailResponse>>(
      `/api/v1/vehicles/${vehicleId}`
    );
    return unwrapApiData(response);
  },

  async getTimeline(
    vehicleId: string,
    params: { page: number; pageSize: number }
  ): Promise<VehicleTimelineResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleTimelineResponse>>(
      `/api/v1/vehicles/${vehicleId}/timeline`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getCurrentDeployment(vehicleId: string): Promise<VehicleCurrentDeployment | null> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleCurrentDeployment | null>>(
      `/api/v1/vehicles/${vehicleId}/current-deployment`
    );
    return unwrapApiData(response);
  },

  async getDeploymentHistory(
    vehicleId: string,
    params: { page: number; pageSize: number }
  ): Promise<VehicleDeploymentHistoryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleDeploymentHistoryResponse>>(
      `/api/v1/vehicles/${vehicleId}/deployment-history`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getServiceHistory(
    vehicleId: string,
    params: { page: number; pageSize: number }
  ): Promise<VehicleServiceHistoryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleServiceHistoryResponse>>(
      `/api/v1/vehicles/${vehicleId}/service-history`,
      { params }
    );
    return unwrapApiData(response);
  },

  async getStatusSummary(vehicleId: string): Promise<VehicleStatusSummaryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleStatusSummaryResponse>>(
      `/api/v1/vehicles/${vehicleId}/status-summary`
    );
    return unwrapApiData(response);
  },

  async getHealthSummary(vehicleId: string): Promise<VehicleHealthSummaryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleHealthSummaryResponse>>(
      `/api/v1/vehicles/${vehicleId}/health-summary`
    );
    return unwrapApiData(response);
  },

  async getDocuments(
    vehicleId: string,
    params: { page: number; pageSize: number; fileType?: string }
  ): Promise<VehicleDocumentResponse> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleDocumentResponse>>(
      `/api/v1/vehicles/${vehicleId}/documents`,
      { params }
    );
    return unwrapApiData(response);
  },

  async activateVehicle(vehicleId: string): Promise<VehicleMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<VehicleMutationResponse>>(
      `/api/v1/vehicles/${vehicleId}/activate`
    );
    return unwrapApiData(response);
  },

  async deactivateVehicle(vehicleId: string): Promise<VehicleMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<VehicleMutationResponse>>(
      `/api/v1/vehicles/${vehicleId}/deactivate`
    );
    return unwrapApiData(response);
  },
};
