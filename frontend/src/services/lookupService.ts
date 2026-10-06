import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface TechnicianLookupResponse {
  technicianId: string;
  technicianName: string;
  mobileNumber: string;
  workshop: string | null;
  hub: string | null;
  availabilityStatus: 'AVAILABLE' | 'BUSY';
  currentActiveTickets: number;
}

export interface ServiceTlLookupResponse {
  id: string;
  name: string;
}

export interface IssueSubcategoryResponse {
  issueCategoryId: string;
  issueCategoryName: string;
  group: string;
  subcategories: string[];
}

export interface IssueCategoryLookupResponse {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
}

export interface VehicleModelLookupResponse {
  id: string;
  modelCode: string;
  displayName: string;
  manufacturer: string;
  vehicleType: string | null;
  active: boolean;
}

export const lookupService = {
  async getIssueCategories(): Promise<IssueCategoryLookupResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<IssueCategoryLookupResponse[]>>(
      '/api/v1/masters/issue-categories'
    );
    return unwrapApiData(response);
  },

  async getTechnicians(params?: {
    hub?: string;
    availability?: 'AVAILABLE' | 'BUSY';
  }): Promise<TechnicianLookupResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<TechnicianLookupResponse[]>>(
      '/api/v1/technicians',
      { params }
    );
    return unwrapApiData(response);
  },

  async getServiceTls(): Promise<ServiceTlLookupResponse[]> {
    const response =
      await apiClient.get<ApiSuccessResponse<ServiceTlLookupResponse[]>>('/api/v1/service-tls');
    return unwrapApiData(response);
  },

  async getIssueSubcategories(issueCategoryId?: string): Promise<IssueSubcategoryResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<IssueSubcategoryResponse[]>>(
      '/api/v1/issue-subcategories',
      {
        params: issueCategoryId ? { issueCategoryId } : undefined,
      }
    );
    return unwrapApiData(response);
  },

  async getVehicleModels(): Promise<VehicleModelLookupResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<VehicleModelLookupResponse[]>>(
      '/api/v1/masters/vehicle-models'
    );
    return unwrapApiData(response);
  },
};
