import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface AttachmentResponse {
  id: string;
  ticketId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  fileReference: string;
}

export const attachmentService = {
  async getAttachments(ticketId: string): Promise<AttachmentResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<AttachmentResponse[]>>(
      `/api/v1/tickets/${ticketId}/attachments`
    );
    return unwrapApiData(response);
  },

  async addAttachment(
    ticketId: string,
    payload: {
      fileName: string;
      fileType: string;
      fileSize: number;
      uploadedBy: string;
    }
  ): Promise<AttachmentResponse> {
    const response = await apiClient.post<ApiSuccessResponse<AttachmentResponse>>(
      `/api/v1/tickets/${ticketId}/attachments`,
      payload
    );
    return unwrapApiData(response);
  },
};
