import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from './types';

/** A normalized shape every screen/hook can rely on, regardless of whether the failure was a network error, a timeout, or a structured backend error response. */
export class ApiError extends Error {
  readonly statusCode: number | null;
  readonly isNetworkError: boolean;
  readonly cause?: unknown;

  constructor(message: string, options: { statusCode?: number | null; isNetworkError?: boolean; cause?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options.statusCode ?? null;
    this.isNetworkError = options.isNetworkError ?? false;
    this.cause = options.cause;
  }
}

/** Converts any error thrown by the Axios pipeline into an `ApiError` - the only error shape the rest of the app should ever need to handle. */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;
  if (axiosError?.isAxiosError) {
    if (!axiosError.response) {
      return new ApiError('Unable to reach the server. Check your connection and try again.', {
        isNetworkError: true,
        cause: axiosError,
      });
    }

    const backendMessage = axiosError.response.data?.error;
    return new ApiError(backendMessage ?? axiosError.message ?? 'Something went wrong.', {
      statusCode: axiosError.response.status,
      cause: axiosError,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message, { cause: error });
  }

  return new ApiError('An unexpected error occurred.', { cause: error });
}
