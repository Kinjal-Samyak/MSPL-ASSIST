import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import { useAuthStore } from '@/store';
import type { UserRole } from '@/types';
import type { ApiSuccessResponse } from '@/types/api.types';

export type AdminRole = UserRole;

export interface AdminDashboardResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalHubs: number;
  totalSettings: number;
}

export interface AdminUser {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  active: boolean;
  hubIds: string[];
  hubs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminRoleItem {
  role: AdminRole;
  description: string;
}

export interface AdminPermissionItem {
  code: string;
  description: string;
  roles: AdminRole[];
}

export interface AdminHub {
  hubId: string;
  name: string;
  city: string;
  state: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSetting {
  settingKey: string;
  category: string;
  value: unknown;
  editableByAdmin: boolean;
  updatedAt: string;
}

export interface AdminUserQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: AdminRole;
  active?: boolean;
  hubId?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'name' | 'email' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  hubIds: string[];
  password: string;
}

export interface UpdateAdminUserPayload {
  name?: string;
  email?: string;
  mobile?: string;
  role?: AdminRole;
  hubIds?: string[];
}

export interface CreateAdminHubPayload {
  name: string;
  city: string;
  state: string;
}

export interface UpdateAdminHubPayload {
  name?: string;
  city?: string;
  state?: string;
  active?: boolean;
}

export interface UpdateAdminSettingsPayload {
  settings: Array<{
    settingKey: string;
    category: string;
    value: unknown;
  }>;
}

function getRoleHeaders() {
  const role = useAuthStore.getState().user?.role;
  return role ? { 'x-user-role': role } : undefined;
}

export const adminService = {
  async getDashboard(): Promise<AdminDashboardResponse> {
    const response = await apiClient.get<ApiSuccessResponse<AdminDashboardResponse>>(
      '/api/v1/admin/dashboard',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getUsers(params: AdminUserQuery): Promise<AdminUserListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<AdminUserListResponse>>(
      '/api/v1/admin/users',
      { params, headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async createUser(payload: CreateAdminUserPayload): Promise<void> {
    await apiClient.post<ApiSuccessResponse<unknown>>('/api/v1/admin/users', payload, {
      headers: getRoleHeaders(),
    });
  },

  async getUserById(userId: string): Promise<AdminUser> {
    const response = await apiClient.get<ApiSuccessResponse<AdminUser>>(
      `/api/v1/admin/users/${userId}`,
      {
        headers: getRoleHeaders(),
      }
    );
    return unwrapApiData(response);
  },

  async updateUser(userId: string, payload: UpdateAdminUserPayload): Promise<void> {
    await apiClient.patch<ApiSuccessResponse<unknown>>(`/api/v1/admin/users/${userId}`, payload, {
      headers: getRoleHeaders(),
    });
  },

  async activateUser(userId: string): Promise<void> {
    await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/api/v1/admin/users/${userId}/activate`,
      undefined,
      {
        headers: getRoleHeaders(),
      }
    );
  },

  async deactivateUser(userId: string): Promise<void> {
    await apiClient.patch<ApiSuccessResponse<unknown>>(
      `/api/v1/admin/users/${userId}/deactivate`,
      undefined,
      {
        headers: getRoleHeaders(),
      }
    );
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete<ApiSuccessResponse<unknown>>(`/api/v1/admin/users/${userId}`, {
      headers: getRoleHeaders(),
    });
  },

  async getRoles(): Promise<AdminRoleItem[]> {
    const response = await apiClient.get<ApiSuccessResponse<AdminRoleItem[]>>(
      '/api/v1/admin/roles',
      {
        headers: getRoleHeaders(),
      }
    );
    return unwrapApiData(response);
  },

  async getPermissions(): Promise<AdminPermissionItem[]> {
    const response = await apiClient.get<ApiSuccessResponse<AdminPermissionItem[]>>(
      '/api/v1/admin/permissions',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getHubs(): Promise<AdminHub[]> {
    const response = await apiClient.get<ApiSuccessResponse<AdminHub[]>>('/api/v1/admin/hubs', {
      headers: getRoleHeaders(),
    });
    return unwrapApiData(response);
  },

  async createHub(payload: CreateAdminHubPayload): Promise<void> {
    await apiClient.post<ApiSuccessResponse<unknown>>('/api/v1/admin/hubs', payload, {
      headers: getRoleHeaders(),
    });
  },

  async updateHub(hubId: string, payload: UpdateAdminHubPayload): Promise<void> {
    await apiClient.patch<ApiSuccessResponse<unknown>>(`/api/v1/admin/hubs/${hubId}`, payload, {
      headers: getRoleHeaders(),
    });
  },

  async getSettings(): Promise<AdminSetting[]> {
    const response = await apiClient.get<ApiSuccessResponse<AdminSetting[]>>(
      '/api/v1/admin/settings',
      {
        headers: getRoleHeaders(),
      }
    );
    return unwrapApiData(response);
  },

  async updateSettings(payload: UpdateAdminSettingsPayload): Promise<AdminSetting[]> {
    const response = await apiClient.patch<ApiSuccessResponse<AdminSetting[]>>(
      '/api/v1/admin/settings',
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },
};
