import type { Role } from "@prisma/client";

export interface PermissionMatrixEntryDto {
  code: string;
  description: string;
  category: string;
  grants: Partial<Record<Role, boolean>>;
}

export interface UpdateRolePermissionsDto {
  updates: Array<{
    role: Role;
    code: string;
    granted: boolean;
  }>;
}
