import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export type ReportTabKey =
  'tickets' | 'customers' | 'vehicles' | 'deployments' | 'workshop' | 'notifications' | 'admin';
export type ReportExportFormat = 'CSV' | 'EXCEL' | 'PDF';

export interface ReportFilterQuery {
  page: number;
  pageSize: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hubId?: string;
  vehicleModelId?: string;
  vehicle?: string;
  technicianId?: string;
  customerId?: string;
  rider?: string;
  status?: string;
  category?: string;
  priority?: string;
  subcategory?: string;
  ticketNumber?: string;
  jobCardNumber?: string;
  coordinatorId?: string;
  serviceTlId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutiveDashboardResponse {
  kpi: {
    fleetUtilization: number;
    revenue: number;
    processingFees: number;
    securityDeposits: number;
    openTickets: number;
    workshopJobs: number;
    deployments: number;
    customerCount: number;
    notificationFailures: number;
  };
  ticketTrend: Array<{ label: string; value: number }>;
  ticketsByStatus: Array<{ label: string; value: number }>;
  ticketsByCategory: Array<{ label: string; value: number }>;
  notificationsByChannel: Array<{ label: string; value: number }>;
}

export interface ReportDashboardResponse {
  generatedAt: string;
  reports: Array<{
    reportKey: string;
    title: string;
    totalRecords: number;
  }>;
  supportedExports: ReportExportFormat[];
}

export interface ReportListResponse<T> {
  items: T[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReportExportResponse {
  fileName: string;
  contentType: string;
  content: string;
}

export const reportService = {
  async getExecutiveDashboard(params: Omit<ReportFilterQuery, 'page' | 'pageSize'>) {
    const response = await apiClient.get<ApiSuccessResponse<ExecutiveDashboardResponse>>(
      '/api/v1/reports/executive-dashboard',
      { params }
    );
    return unwrapApiData(response);
  },

  async getDashboard() {
    const response = await apiClient.get<ApiSuccessResponse<ReportDashboardResponse>>(
      '/api/v1/reports/dashboard'
    );
    return unwrapApiData(response);
  },

  async getReportList<T>(tab: ReportTabKey, params: ReportFilterQuery) {
    const response = await apiClient.get<ApiSuccessResponse<ReportListResponse<T>>>(
      `/api/v1/reports/${tab}`,
      { params }
    );
    return unwrapApiData(response);
  },

  async exportReport(tab: ReportTabKey, format: ReportExportFormat, params: ReportFilterQuery) {
    const response = await apiClient.get<ApiSuccessResponse<ReportExportResponse>>(
      '/api/v1/reports/export',
      {
        params: {
          ...params,
          report: tab,
          format,
        },
      }
    );
    return unwrapApiData(response);
  },
};
