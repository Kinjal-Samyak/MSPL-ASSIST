/** Mirrors the backend's response envelope (see frontend/src/types/api.types.ts) so every client speaks the same contract. */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
