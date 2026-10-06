import type { AdminRole } from '@/services/adminService';

export interface AdminUserFiltersState {
  search: string;
  role: '' | AdminRole;
  active: '' | 'true' | 'false';
  hubId: string;
}

export interface AdminUserSortState {
  key: 'updatedAt' | 'createdAt' | 'name' | 'email' | 'role';
  direction: 'asc' | 'desc';
}

export interface AdminUserFormState {
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  hubIds: string[];
  password: string;
}
