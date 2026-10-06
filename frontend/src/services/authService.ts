import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { AuthSession, LoginCredentials, User } from '@/types';
import type { ApiSuccessResponse } from '@/types/api.types';

interface RefreshTokenPayload {
  refreshToken: string;
}

interface LogoutResponse {
  loggedOutAt: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await apiClient.post<ApiSuccessResponse<AuthSession>>(
      '/api/v1/auth/login',
      credentials
    );
    return unwrapApiData(response);
  },

  async refresh(payload: RefreshTokenPayload): Promise<AuthSession> {
    const response = await apiClient.post<ApiSuccessResponse<AuthSession>>(
      '/api/v1/auth/refresh',
      payload
    );
    return unwrapApiData(response);
  },

  async me(): Promise<User> {
    const response = await apiClient.get<ApiSuccessResponse<User>>('/api/v1/auth/me');
    return unwrapApiData(response);
  },

  async logout(payload: RefreshTokenPayload): Promise<LogoutResponse> {
    const response = await apiClient.post<ApiSuccessResponse<LogoutResponse>>(
      '/api/v1/auth/logout',
      payload
    );
    return unwrapApiData(response);
  },
};
