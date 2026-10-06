import type { Role } from "@prisma/client";

export type AdminAccessRole = Role;
export type SortOrder = "asc" | "desc";
export type AdminUserSortBy = "updatedAt" | "createdAt" | "name" | "email" | "role";

export interface AdminDashboardDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalHubs: number;
  totalSettings: number;
}

export interface AdminUserListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  role?: Role;
  active?: boolean;
  hubId?: string;
  sortBy: AdminUserSortBy;
  sortOrder: SortOrder;
}

export interface CreateAdminUserDto {
  name: string;
  email: string;
  mobile: string;
  role: Role;
  hubIds: string[];
  password: string;
  department?: string;
}

export interface UpdateAdminUserDto {
  name?: string;
  email?: string;
  mobile?: string;
  role?: Role;
  hubIds?: string[];
  department?: string;
}

export interface ResetAdminUserPasswordDto {
  password: string;
}

export interface AdminUserDto {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  active: boolean;
  locked: boolean;
  failedLoginAttempts: number;
  department: string | null;
  hubIds: string[];
  hubs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponseDto {
  items: AdminUserDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminMutationResponseDto {
  userId?: string;
  hubId?: string;
  settingKey?: string;
  status: "SUCCESS";
  message: string;
  updatedAt: string;
}

export interface AdminRoleDto {
  role: Role;
  description: string;
}

export interface AdminPermissionDto {
  code: string;
  description: string;
  roles: Role[];
}

export interface AdminHubDto {
  hubId: string;
  name: string;
  city: string;
  state: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminHubDto {
  name: string;
  city: string;
  state: string;
}

export interface UpdateAdminHubDto {
  name?: string;
  city?: string;
  state?: string;
  active?: boolean;
}

export interface AdminSettingDto {
  settingKey: string;
  category: string;
  value: unknown;
  editableByAdmin: boolean;
  updatedAt: string;
}

export interface UpdateAdminSettingsDto {
  settings: Array<{
    settingKey: string;
    category: string;
    value: unknown;
  }>;
}
