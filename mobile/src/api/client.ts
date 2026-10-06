import axios, { type InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from '@/config';
import { tokenProvider } from '@/services/tokenProvider';
import { normalizeError } from './errors';

export const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
  headers: apiConfig.defaultHeaders,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = tokenProvider.getAccessToken();
  if (accessToken && config.headers) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Fires once per 401 response, letting whichever module owns session lifecycle (AuthProvider)
 * react without the API layer needing to know what "logged out" means. Nothing registers a
 * handler yet - registration happens when the authentication feature is built.
 */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = normalizeError(error);
    if (apiError.statusCode === 401) {
      unauthorizedHandler?.();
    }
    return Promise.reject(apiError);
  }
);
