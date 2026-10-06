import { AxiosError } from 'axios';
import type { ApiSuccessResponse } from '@/types/api.types';

export function unwrapApiData<T>(response: { data: ApiSuccessResponse<T> }): T {
  return response.data.data;
}

export function toApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || String(error.message).toLowerCase().includes('timeout')) {
      return 'The request timed out. Please retry.';
    }

    const statusCode = error.response?.status;
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    const backendMessage = payload?.error ?? payload?.message;

    if (statusCode === 400) return backendMessage ?? 'Invalid request. Please review the input.';
    if (statusCode === 401) return 'Your session has expired. Please sign in again.';
    if (statusCode === 403) return 'You are not allowed to perform this action.';
    if (statusCode === 404) return backendMessage ?? 'Requested record was not found.';
    if (statusCode === 409) return backendMessage ?? 'This action conflicts with current data.';
    if (statusCode === 422) return backendMessage ?? 'The request could not be processed.';
    if (statusCode === 500) return 'Something went wrong on the server. Please try again.';

    return backendMessage ?? 'Request failed. Please try again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unexpected error occurred. Please try again.';
}
