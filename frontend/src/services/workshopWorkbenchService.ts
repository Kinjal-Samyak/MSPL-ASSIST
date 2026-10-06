import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export type WorkshopWorkbenchStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'RFD';

export interface WorkshopWorkbenchSummary {
  openJobCards: number;
  openTickets: number;
  assignedToTechnician: number;
  inProgress: number;
  completed: number;
  readyForDeployment: number;
  returnedToWorkshop: number;
}

export interface WorkshopWorkbenchJobCardListItem {
  jobCardId: string;
  jobCardNumber: string;
  ticketId: string;
  ticketNumber: string;
  riderName: string;
  mobileNumber: string;
  vehicle: string | null;
  hub: string | null;
  technicianId: string;
  technicianName: string;
  status: WorkshopWorkbenchStatus | 'WAITING_PARTS';
  statusLabel: string;
  ticketStatus: string;
  priority: string;
  updatedAt: string;
}

export interface WorkshopWorkbenchListQuery {
  page: number;
  pageSize: number;
  search?: string;
  hub?: string;
  technicianId?: string;
  status?: WorkshopWorkbenchStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface WorkshopWorkbenchListResponse {
  items: WorkshopWorkbenchJobCardListItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export const workshopWorkbenchService = {
  async getSummary(): Promise<WorkshopWorkbenchSummary> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopWorkbenchSummary>>(
      '/api/v1/workshop-dashboard/summary'
    );
    return unwrapApiData(response);
  },

  async listJobCards(query: WorkshopWorkbenchListQuery): Promise<WorkshopWorkbenchListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopWorkbenchListResponse>>(
      '/api/v1/workshop-dashboard/job-cards',
      { params: query }
    );
    return unwrapApiData(response);
  },
};
