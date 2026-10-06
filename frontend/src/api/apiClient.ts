import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ROUTES } from '@/constants';
import { apiConfig } from '@/config/api';
import { workspaceService } from '@/services/workspaceService';
import { useAuthStore } from '@/store/authStore';
import type { AuthSession } from '@/types';
import type { ApiSuccessResponse } from '@/types/api.types';

const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  headers: apiConfig.defaultHeaders,
  timeout: apiConfig.timeoutMs,
});

let refreshPromise: Promise<string> | null = null;

function isAuthRoute(url?: string): boolean {
  return (
    url?.includes('/api/v1/auth/login') === true ||
    url?.includes('/api/v1/auth/refresh') === true ||
    url?.includes('/api/v1/auth/logout') === true
  );
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, clearSession, setSession } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('Refresh token is not available.');
  }

  try {
    const response = await axios.post<ApiSuccessResponse<AuthSession>>(
      workspaceService.getApiBaseUrl() + '/api/v1/auth/refresh',
      { refreshToken },
      {
        headers: apiConfig.defaultHeaders,
        timeout: apiConfig.timeoutMs,
      }
    );
    const authSession = response.data.data;
    setSession(authSession.user, authSession.tokens.accessToken, authSession.tokens.refreshToken);
    return authSession.tokens.accessToken;
  } catch (error) {
    void error;
    clearSession();
    throw new Error('Session refresh failed.');
  }
}

async function getRefreshedAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = workspaceService.getApiBaseUrl();
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers['Authorization'] = 'Bearer ' + accessToken;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await getRefreshedAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        return apiClient(originalRequest);
      } catch (refreshError) {
        void refreshError;
      }
    }

    if (status === 401) {
      useAuthStore.getState().clearSession();
      window.location.href = ROUTES.LOGIN;
    }
    return Promise.reject(error);
  }
);

export default apiClient;
