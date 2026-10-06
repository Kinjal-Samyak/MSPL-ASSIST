import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export type JobCardStage = 'IN_PROGRESS' | 'WAITING_PARTS' | 'RFD';

export interface TechnicianDashboard {
  assignedJobs: number;
  jobsInProgress: number;
  waitingForParts: number;
  completedToday: number;
  averageRepairTimeHours: number;
  slaCompliancePercent: number;
  overdueJobs: number;
  jobCardStageCounts: {
    IN_PROGRESS: number;
    WAITING_PARTS: number;
    RFD: number;
  };
}

export interface TechnicianJob {
  id: string;
  ticketNumber: string;
  mvTrackNumber: string | null;
  riderName: string;
  vehicleModel: string | null;
  registrationNumber: string | null;
  complaintSummary: string;
  priority: string;
  assignedAt: string | null;
  currentMilestone: string;
  slaDueAt: string | null;
  jobCardStage: JobCardStage | null;
}

export interface TechnicianJobDetail extends TechnicianJob {
  asset: {
    mvTrackNumber: string | null;
    vehicleModel: string | null;
    registrationNumber: string | null;
    hub: string | null;
    deploymentStatus: string | null;
    currentRider: string | null;
  };
  complaint: {
    issueCategory: string;
    description: string;
    riderRemarks: string | null;
    coordinatorNotes: string | null;
  };
  parts: { available: false; message: string };
}

export interface TechnicianTimelineItem {
  id: string;
  action: string;
  remarks: string | null;
  createdAt: string;
  technicianName: string;
}
export interface TechnicianRepairHistoryItem {
  ticketNumber: string;
  repairDate: string | null;
  complaint: string;
  resolution: string | null;
  technician: string | null;
  partsUsed: string[];
}

export interface TechnicianJobList {
  items: TechnicianJob[];
  total: number;
  page: number;
  pageSize: number;
}

export const technicianConsoleService = {
  async dashboard(): Promise<TechnicianDashboard> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<TechnicianDashboard>>('/api/v1/technician/dashboard')
    );
  },
  async jobs(params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<TechnicianJobList> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<TechnicianJobList>>('/api/v1/technician/jobs', {
        params,
      })
    );
  },
  async job(ticketId: string): Promise<TechnicianJobDetail> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<TechnicianJobDetail>>(
        `/api/v1/technician/jobs/${ticketId}`
      )
    );
  },
  async advanceMilestone(
    ticketId: string,
    action?: string,
    remarks?: string
  ): Promise<{ milestone: string }> {
    return unwrapApiData(
      await apiClient.patch<ApiSuccessResponse<{ milestone: string }>>(
        `/api/v1/technician/jobs/${ticketId}/milestone`,
        { action, remarks }
      )
    );
  },
  async recordInspection(
    ticketId: string,
    input: {
      initialFindings: string;
      observations?: string;
      rootCause?: string;
      repairRecommendation?: string;
    }
  ): Promise<unknown> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<unknown>>(
        `/api/v1/technician/jobs/${ticketId}/inspection`,
        input
      )
    );
  },
  async addRepairNote(
    ticketId: string,
    input: {
      findings?: string;
      rootCause?: string;
      repairPerformed?: string;
      recommendations?: string;
    }
  ): Promise<unknown> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<unknown>>(
        `/api/v1/technician/jobs/${ticketId}/notes`,
        input
      )
    );
  },
  async attachPhotoReference(
    ticketId: string,
    input: {
      photoType: 'BEFORE_REPAIR' | 'DURING_REPAIR' | 'AFTER_REPAIR' | 'DAMAGED_COMPONENT';
      reference: string;
    }
  ): Promise<unknown> {
    return unwrapApiData(
      await apiClient.post<ApiSuccessResponse<unknown>>(
        `/api/v1/technician/jobs/${ticketId}/photos`,
        input
      )
    );
  },
  async timeline(ticketId: string): Promise<TechnicianTimelineItem[]> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<TechnicianTimelineItem[]>>(
        `/api/v1/technician/jobs/${ticketId}/timeline`
      )
    );
  },
  async repairHistory(ticketId: string): Promise<TechnicianRepairHistoryItem[]> {
    return unwrapApiData(
      await apiClient.get<ApiSuccessResponse<TechnicianRepairHistoryItem[]>>(
        `/api/v1/technician/jobs/${ticketId}/history`
      )
    );
  },
};
