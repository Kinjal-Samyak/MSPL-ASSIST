import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface DashboardSummaryQuery {
  from?: string;
  to?: string;
}

export interface DashboardKpi {
  value: number;
  deltaVsYesterdayPct: number | null;
  sparkline: number[];
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface DashboardHub {
  hub: string;
  openTickets: number;
}

export interface DashboardCriticalTicket {
  id: string;
  ticketNumber: string;
  category: string;
  priority: string;
  createdAt: string;
  hub: string | null;
  vehicleNumber: string | null;
  eta: string | null;
}

export interface DashboardSummaryResponse {
  openTickets: DashboardKpi;
  closedTickets: DashboardKpi;
  inProgress: DashboardKpi;
  waitingForParts: DashboardKpi;
  serviceLossToday: DashboardKpi;
  slaCompliance: {
    withinSla: number;
    breached: number;
    noSla: number;
    withinSlaPct: number;
  };
  ticketsTrend: DashboardTrendPoint[];
  topHubs: DashboardHub[];
  recentCriticalTickets: DashboardCriticalTicket[];
  todaysActivities: {
    created: number;
    updated: number;
    resolved: number;
    rfdMarked: number;
  };
  generatedAt: string;
}

export const dashboardService = {
  async getSummary(query: DashboardSummaryQuery = {}): Promise<DashboardSummaryResponse> {
    const response = await apiClient.get<ApiSuccessResponse<DashboardSummaryResponse>>(
      '/api/v1/dashboard/summary',
      { params: query }
    );
    return unwrapApiData(response);
  },
};
