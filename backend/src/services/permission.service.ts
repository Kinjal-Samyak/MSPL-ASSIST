import type { Role } from "@prisma/client";
import { prismaClient } from "../database";
import type { PermissionMatrixEntryDto, UpdateRolePermissionsDto } from "../dto/permission.dto";
import { ValidationError } from "../errors";

const ROLE_VALUES: readonly Role[] = ["ADMIN", "COORDINATOR", "TECHNICIAN", "SERVICE_TL", "SERVICE_MANAGER"];

export class PermissionService {
  async isGranted(role: Role, code: string): Promise<boolean> {
    const rolePermission = await prismaClient.rolePermission.findFirst({
      where: {
        role,
        granted: true,
        permission: { code },
      },
      select: { id: true },
    });
    return rolePermission !== null;
  }

  async getMatrix(): Promise<PermissionMatrixEntryDto[]> {
    const permissions = await prismaClient.permission.findMany({
      include: { rolePermissions: true },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    return permissions.map((permission) => {
      const grants: Partial<Record<Role, boolean>> = {};
      for (const rolePermission of permission.rolePermissions) {
        grants[rolePermission.role] = rolePermission.granted;
      }
      return {
        code: permission.code,
        description: permission.description,
        category: permission.category,
        grants,
      };
    });
  }

  async updateMatrix(payload: UpdateRolePermissionsDto): Promise<PermissionMatrixEntryDto[]> {
    if (!Array.isArray(payload.updates) || payload.updates.length === 0) {
      throw new ValidationError("updates must be a non-empty array.");
    }
    for (const update of payload.updates) {
      if (!ROLE_VALUES.includes(update.role)) {
        throw new ValidationError(`role must be one of ${ROLE_VALUES.join(", ")}.`);
      }
      if (typeof update.code !== "string" || !update.code.trim()) {
        throw new ValidationError("code is required.");
      }
      if (typeof update.granted !== "boolean") {
        throw new ValidationError("granted must be a boolean.");
      }
    }

    await prismaClient.$transaction(async (tx) => {
      for (const update of payload.updates) {
        const permission = await tx.permission.findUnique({ where: { code: update.code } });
        if (!permission) {
          throw new ValidationError(`Unknown permission code: ${update.code}.`);
        }
        await tx.rolePermission.upsert({
          where: { role_permissionId: { role: update.role, permissionId: permission.id } },
          update: { granted: update.granted },
          create: { role: update.role, permissionId: permission.id, granted: update.granted },
        });
      }
    });

    return this.getMatrix();
  }
}

export const permissionService = new PermissionService();
