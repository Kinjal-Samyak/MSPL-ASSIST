import type { Hub, Role } from "@prisma/client";
import type {
  AdminDashboardDto,
  AdminHubDto,
  AdminMutationResponseDto,
  AdminPermissionDto,
  AdminRoleDto,
  AdminSettingDto,
  AdminUserDto,
  AdminUserListResponseDto,
} from "../dto/admin.dto";
import type { AdminUserRow } from "../repositories/admin.repository";

export class AdminMapper {
  static toDashboard(input: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalRoles: number;
    totalPermissions: number;
    totalHubs: number;
    totalSettings: number;
  }): AdminDashboardDto {
    return {
      totalUsers: input.totalUsers,
      activeUsers: input.activeUsers,
      inactiveUsers: input.inactiveUsers,
      totalRoles: input.totalRoles,
      totalPermissions: input.totalPermissions,
      totalHubs: input.totalHubs,
      totalSettings: input.totalSettings,
    };
  }

  static toUser(row: AdminUserRow): AdminUserDto {
    return {
      userId: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      role: row.role,
      active: row.active,
      locked: row.lockedAt !== null,
      failedLoginAttempts: row.failedLoginAttempts,
      department: row.department,
      hubIds: row.userHubs.map((entry) => entry.hub.id),
      hubs: row.userHubs.map((entry) => entry.hub.name),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toUserList(items: AdminUserDto[], totalRecords: number, page: number, pageSize: number): AdminUserListResponseDto {
    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toMutationResponse(message: string, updatedAt: Date, ids?: { userId?: string; hubId?: string; settingKey?: string }): AdminMutationResponseDto {
    return {
      userId: ids?.userId,
      hubId: ids?.hubId,
      settingKey: ids?.settingKey,
      status: "SUCCESS",
      message,
      updatedAt: updatedAt.toISOString(),
    };
  }

  static toRoles(roles: Role[]): AdminRoleDto[] {
    const descriptions: Record<Role, string> = {
      ADMIN: "Full administrative access with write privileges.",
      SERVICE_MANAGER: "Same access as Administrator, except deleting a service ticket.",
      COORDINATOR: "Read-only administrative access for configuration visibility.",
      TECHNICIAN: "No administrative access.",
      SERVICE_TL: "No administrative access.",
    };
    return roles.map((role) => ({
      role,
      description: descriptions[role],
    }));
  }

  static toPermissions(): AdminPermissionDto[] {
    return [
      {
        code: "ADMIN_USERS_READ",
        description: "View user accounts and details.",
        roles: ["ADMIN", "COORDINATOR"],
      },
      {
        code: "ADMIN_USERS_WRITE",
        description: "Create, update, activate and deactivate users.",
        roles: ["ADMIN"],
      },
      {
        code: "ADMIN_HUBS_READ",
        description: "View hub configuration.",
        roles: ["ADMIN", "COORDINATOR"],
      },
      {
        code: "ADMIN_HUBS_WRITE",
        description: "Create and update hub configuration.",
        roles: ["ADMIN"],
      },
      {
        code: "ADMIN_SETTINGS_READ",
        description: "View application, notification and master settings.",
        roles: ["ADMIN", "COORDINATOR"],
      },
      {
        code: "ADMIN_SETTINGS_WRITE",
        description: "Update application, notification and master settings.",
        roles: ["ADMIN"],
      },
    ];
  }

  static toUsersCsv(users: AdminUserDto[]): string {
    const headers = ["Name", "Email", "Mobile", "Role", "Department", "Active", "Locked", "Hubs", "Created At"];
    const lines = [headers.join(",")];
    for (const user of users) {
      const row = [
        user.name,
        user.email,
        user.mobile,
        user.role,
        user.department ?? "",
        user.active ? "Yes" : "No",
        user.locked ? "Yes" : "No",
        user.hubs.join(" | "),
        user.createdAt,
      ];
      lines.push(row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    }
    return lines.join("\n");
  }

  static toHub(row: Hub): AdminHubDto {
    return {
      hubId: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toSetting(row: { settingKey: string; category: string; value: unknown; editableByAdmin: boolean; updatedAt: Date }): AdminSettingDto {
    return {
      settingKey: row.settingKey,
      category: row.category,
      value: row.value,
      editableByAdmin: row.editableByAdmin,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
