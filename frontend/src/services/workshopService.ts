import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { VehicleOperationalStatus } from './vehicleService';
import type { OperationalPriority } from '@mspl/shared-constants';

export type WorkshopPriority = OperationalPriority;

export interface WorkshopDashboardResponse {
  totalJobs: number;
  openJobs: number;
  assignedJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
}

export interface WorkshopJobListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  priority?: WorkshopPriority;
  technicianId?: string;
  hubName?: string;
  sortBy?:
    | 'updatedAt'
    | 'createdAt'
    | 'ticketNumber'
    | 'status'
    | 'priority'
    | 'customerName'
    | 'vehicleNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkshopJobListItem {
  jobId: string;
  ticketNumber: string;
  status: string;
  priority: WorkshopPriority;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deploymentId: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  vehicleStatus: VehicleOperationalStatus | null;
  hubName: string;
  technicianId: string | null;
  technicianName: string | null;
  issueCategory: string;
  issueDescription: string;
  createdAt: string;
  updatedAt: string;
  eta: string | null;
}

export interface WorkshopJobListResponse {
  items: WorkshopJobListItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopJobDetailResponse extends WorkshopJobListItem {
  vehicleVin: string | null;
  batteryNumber: string | null;
  registrationNumber: string | null;
  estimatedCharges: string | null;
  finalCharges: string | null;
  coordinatorNotes: string | null;
  openTicketCount: number;
}

export interface WorkshopTimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface WorkshopTimelineResponse {
  items: WorkshopTimelineEvent[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopPartItem {
  partId: string;
  issueCategory: string;
  description: string;
  issueStatus: string;
  sequenceNumber: number;
}

export interface WorkshopPartsResponse {
  items: WorkshopPartItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopAttachmentItem {
  attachmentId: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface WorkshopAttachmentsResponse {
  items: WorkshopAttachmentItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopMutationResponse {
  jobId: string;
  ticketNumber: string;
  status: string;
  updatedAt: string;
}

export interface CreateWorkshopJobPayload {
  deploymentId: string;
  issueCategoryId: string;
  issueDescription: string;
  priority: WorkshopPriority;
  coordinatorNotes?: string;
  eta?: string;
  estimatedCharges?: number;
}

export interface UpdateWorkshopJobPayload {
  issueDescription?: string;
  coordinatorNotes?: string;
  eta?: string;
  estimatedCharges?: number;
  finalCharges?: number;
  priority?: WorkshopPriority;
}

export interface AssignWorkshopJobPayload {
  technicianId: string;
  assignmentNotes?: string;
}

const TIMELINE_QUERY = { page: 1, pageSize: 20 };

export const workshopService = {
  async getDashboard(params?: Partial<WorkshopJobListQuery>): Promise<WorkshopDashboardResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopDashboardResponse>>(
      '/api/v1/workshop/dashboard',
      { params }
    );
    return unwrapApiData(response);
  },

  async getJobs(params: WorkshopJobListQuery): Promise<WorkshopJobListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopJobListResponse>>(
      '/api/v1/workshop/jobs',
      { params }
    );
    return unwrapApiData(response);
  },

  async searchJobs(params: WorkshopJobListQuery): Promise<WorkshopJobListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopJobListResponse>>(
      '/api/v1/workshop/jobs/search',
      { params }
    );
    return unwrapApiData(response);
  },

  async getJobById(jobId: string): Promise<WorkshopJobDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopJobDetailResponse>>(
      `/api/v1/workshop/jobs/${jobId}`
    );
    return unwrapApiData(response);
  },

  async createJob(payload: CreateWorkshopJobPayload): Promise<WorkshopMutationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<WorkshopMutationResponse>>(
      '/api/v1/workshop/jobs',
      payload
    );
    return unwrapApiData(response);
  },

  async updateJob(
    jobId: string,
    payload: UpdateWorkshopJobPayload
  ): Promise<WorkshopMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<WorkshopMutationResponse>>(
      `/api/v1/workshop/jobs/${jobId}`,
      payload
    );
    return unwrapApiData(response);
  },

  async assignJob(
    jobId: string,
    payload: AssignWorkshopJobPayload
  ): Promise<WorkshopMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<WorkshopMutationResponse>>(
      `/api/v1/workshop/jobs/${jobId}/assign`,
      payload
    );
    return unwrapApiData(response);
  },

  async startJob(jobId: string): Promise<WorkshopMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<WorkshopMutationResponse>>(
      `/api/v1/workshop/jobs/${jobId}/start`
    );
    return unwrapApiData(response);
  },

  async completeJob(jobId: string): Promise<WorkshopMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<WorkshopMutationResponse>>(
      `/api/v1/workshop/jobs/${jobId}/complete`
    );
    return unwrapApiData(response);
  },

  async cancelJob(jobId: string): Promise<WorkshopMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<WorkshopMutationResponse>>(
      `/api/v1/workshop/jobs/${jobId}/cancel`
    );
    return unwrapApiData(response);
  },

  async getTimeline(jobId: string): Promise<WorkshopTimelineResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopTimelineResponse>>(
      `/api/v1/workshop/jobs/${jobId}/timeline`,
      { params: TIMELINE_QUERY }
    );
    return unwrapApiData(response);
  },

  async getParts(jobId: string): Promise<WorkshopPartsResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopPartsResponse>>(
      `/api/v1/workshop/jobs/${jobId}/parts`,
      { params: TIMELINE_QUERY }
    );
    return unwrapApiData(response);
  },

  async getAttachments(jobId: string): Promise<WorkshopAttachmentsResponse> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopAttachmentsResponse>>(
      `/api/v1/workshop/jobs/${jobId}/attachments`,
      { params: TIMELINE_QUERY }
    );
    return unwrapApiData(response);
  },
};
