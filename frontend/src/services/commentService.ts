import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface CommentResponse {
  id: string;
  ticketId: string;
  commentType: 'INTERNAL' | 'TECHNICIAN' | 'CUSTOMER' | 'SYSTEM';
  text: string;
  userName: string | null;
  userRole: string | null;
  createdAt: string;
}

export const commentService = {
  async getComments(ticketId: string): Promise<CommentResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<CommentResponse[]>>(
      `/api/v1/tickets/${ticketId}/comments`
    );
    return unwrapApiData(response);
  },

  async addComment(
    ticketId: string,
    payload: {
      commentType: 'INTERNAL' | 'TECHNICIAN' | 'CUSTOMER' | 'SYSTEM';
      text: string;
      userName?: string;
      userRole?: string;
    }
  ): Promise<CommentResponse> {
    const response = await apiClient.post<ApiSuccessResponse<CommentResponse>>(
      `/api/v1/tickets/${ticketId}/comments`,
      payload
    );
    return unwrapApiData(response);
  },
};
