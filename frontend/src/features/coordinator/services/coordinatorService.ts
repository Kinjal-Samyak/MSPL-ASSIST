import apiClient from '@/api/apiClient';
import type { CoordinatorImportBatch } from '../types/coordinator.types';

type ApiResponse<T> = { success: true; data: T };

export const coordinatorService = {
  async coordinatorDashboard() {
    return (
      await apiClient.get<ApiResponse<Record<string, number>>>(
        '/api/v1/coordinator/dashboard/summary'
      )
    ).data.data;
  },
  async actionCenter() {
    return (await apiClient.get<ApiResponse<any[]>>('/api/v1/coordinator/action-center')).data.data;
  },
  async coordinatorReports(params: Record<string, string> = {}) {
    return (await apiClient.get<ApiResponse<any[]>>('/api/v1/coordinator/reports', { params })).data
      .data;
  },
  async getWorkbench(params: Record<string, string | number | undefined> = {}) {
    const response = await apiClient.get<ApiResponse<{ items: any[]; total: number }>>(
      '/api/v1/coordinator/tickets',
      { params }
    );
    return response.data.data;
  },
  async getWorkbenchSummary() {
    const response = await apiClient.get<ApiResponse<Record<string, number>>>(
      '/api/v1/coordinator/tickets/summary'
    );
    return response.data.data;
  },
  async updateWorkbenchStatus(id: string, status: string, remarks?: string) {
    return (
      await apiClient.put<ApiResponse<any>>(`/api/v1/coordinator/tickets/${id}/status`, {
        status,
        remarks,
      })
    ).data.data;
  },
  async getWorkbenchDetail(id: string) {
    return (await apiClient.get<ApiResponse<any>>(`/api/v1/coordinator/tickets/${id}`)).data.data;
  },
  async reopenTicket(id: string, remarks: string) {
    return (
      await apiClient.put<ApiResponse<any>>(`/api/v1/coordinator/tickets/${id}/reopen`, { remarks })
    ).data.data;
  },
  async returnTicketToWorkshop(id: string, remarks: string) {
    return (
      await apiClient.put<ApiResponse<any>>(
        `/api/v1/coordinator/tickets/${id}/return-to-workshop`,
        { remarks }
      )
    ).data.data;
  },
  async createFollowUpTicket(id: string, payload: { issueDescription: string; remarks?: string }) {
    return (
      await apiClient.post<ApiResponse<any>>(`/api/v1/coordinator/tickets/${id}/follow-up`, payload)
    ).data.data;
  },
  async closeTicket(
    id: string,
    payload: { remarks: string; paymentMode: string; utrNumber: string; amount: number }
  ) {
    return (
      await apiClient.put<ApiResponse<any>>(`/api/v1/coordinator/tickets/${id}/close`, payload)
    ).data.data;
  },
  async requestTicketClosure(id: string, payload: object) {
    return (
      await apiClient.post<ApiResponse<any>>(
        `/api/v1/coordinator/tickets/${id}/closure-requests`,
        payload
      )
    ).data.data;
  },
  async getTicketClosureRequests(id: string) {
    return (
      await apiClient.get<ApiResponse<any[]>>(`/api/v1/coordinator/tickets/${id}/closure-requests`)
    ).data.data;
  },
  async uploadWorkbook(file: File): Promise<CoordinatorImportBatch> {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('The selected file could not be read.'));
      reader.readAsDataURL(file);
    });
    const response = await apiClient.post<ApiResponse<CoordinatorImportBatch>>(
      '/api/v1/import/upload',
      {
        fileName: file.name,
        fileSizeBytes: file.size,
        contentBase64,
      }
    );
    return response.data.data;
  },
  async commitImport(batchId: string): Promise<CoordinatorImportBatch> {
    const response = await apiClient.post<ApiResponse<CoordinatorImportBatch>>(
      `/api/v1/import/commit/${batchId}`
    );
    return response.data.data;
  },
  async getImportHistory(): Promise<CoordinatorImportBatch[]> {
    const response =
      await apiClient.get<ApiResponse<CoordinatorImportBatch[]>>('/api/v1/import/history');
    return response.data.data;
  },
  async downloadErrorReport(batchId: string): Promise<void> {
    const response = await apiClient.get(`/api/v1/import/errors/${batchId}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `import-errors-${batchId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
} as const;
