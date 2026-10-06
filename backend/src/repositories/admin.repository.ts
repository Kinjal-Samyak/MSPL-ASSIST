import type { AppSetting, Hub, Prisma, PrismaClient, Role, User } from "@prisma/client";
import type {
  AdminUserListQueryDto,
  CreateAdminHubDto,
  CreateAdminUserDto,
  UpdateAdminHubDto,
  UpdateAdminUserDto,
} from "../dto/admin.dto";

export type AdminUserRow = User & {
  userHubs: Array<{
    hub: Pick<Hub, "id" | "name">;
  }>;
};

export class AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboardCounts(permissionCount: number, roleCount: number): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalRoles: number;
    totalPermissions: number;
    totalHubs: number;
    totalSettings: number;
  }> {
    const [totalUsers, activeUsers, inactiveUsers, totalHubs, totalSettings] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { active: true, deletedAt: null } }),
      this.prisma.user.count({ where: { active: false, deletedAt: null } }),
      this.prisma.hub.count({ where: { active: true, deletedAt: null } }),
      this.prisma.appSetting.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRoles: roleCount,
      totalPermissions: permissionCount,
      totalHubs,
      totalSettings,
    };
  }

  async listUsers(query: AdminUserListQueryDto): Promise<{ items: AdminUserRow[]; totalRecords: number }> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { mobile: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.active === undefined ? {} : { active: query.active }),
      ...(query.hubId
        ? {
            userHubs: {
              some: {
                hubId: query.hubId,
              },
            },
          }
        : {}),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toUserOrderBy(query.sortBy, query.sortOrder),
        include: {
          userHubs: {
            include: {
              hub: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      totalRecords,
    };
  }

  async findUserById(userId: string): Promise<AdminUserRow | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async createUser(payload: CreateAdminUserDto, passwordHash: string): Promise<AdminUserRow> {
    return this.prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        mobile: payload.mobile,
        role: payload.role,
        department: payload.department,
        active: true,
        passwordHash,
        passwordChangedAt: new Date(),
        userHubs: {
          createMany: {
            data: payload.hubIds.map((hubId) => ({ hubId })),
          },
        },
      },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async updateUser(userId: string, payload: UpdateAdminUserDto): Promise<AdminUserRow> {
    return this.prisma.$transaction(async (tx) => {
      if (payload.hubIds) {
        await tx.userHub.deleteMany({
          where: {
            userId,
          },
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          ...(payload.name === undefined ? {} : { name: payload.name }),
          ...(payload.email === undefined ? {} : { email: payload.email }),
          ...(payload.mobile === undefined ? {} : { mobile: payload.mobile }),
          ...(payload.role === undefined ? {} : { role: payload.role }),
          ...(payload.department === undefined ? {} : { department: payload.department }),
          ...(payload.hubIds
            ? {
                userHubs: {
                  createMany: {
                    data: payload.hubIds.map((hubId) => ({ hubId })),
                  },
                },
              }
            : {}),
        },
        include: {
          userHubs: {
            include: {
              hub: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async setUserActive(userId: string, active: boolean): Promise<AdminUserRow> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        active,
      },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async resetPassword(userId: string, passwordHash: string): Promise<AdminUserRow> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedAt: null,
      },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async setUserLocked(userId: string, locked: boolean): Promise<AdminUserRow> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lockedAt: locked ? new Date() : null,
        failedLoginAttempts: locked ? undefined : 0,
      },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /** Soft-delete only: sets deletedAt and active:false but never touches the row's FK-referencing
   * history (assigned tickets, job cards, activities, spare part decisions, etc.) - those keep
   * resolving the user's name/id exactly as before, since the User row itself is never removed. */
  async softDeleteUser(userId: string): Promise<AdminUserRow> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        active: false,
      },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async listAllUsersForExport(): Promise<AdminUserRow[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        userHubs: {
          include: {
            hub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async listRoles(): Promise<Role[]> {
    return ["ADMIN", "COORDINATOR", "TECHNICIAN", "SERVICE_TL", "SERVICE_MANAGER"];
  }

  async listHubs(): Promise<Hub[]> {
    return this.prisma.hub.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findHubById(hubId: string): Promise<Hub | null> {
    return this.prisma.hub.findFirst({
      where: {
        id: hubId,
        deletedAt: null,
      },
    });
  }

  async createHub(payload: CreateAdminHubDto): Promise<Hub> {
    return this.prisma.hub.create({
      data: {
        name: payload.name,
        city: payload.city,
        state: payload.state,
        active: true,
      },
    });
  }

  async updateHub(hubId: string, payload: UpdateAdminHubDto): Promise<Hub> {
    return this.prisma.hub.update({
      where: { id: hubId },
      data: {
        ...(payload.name === undefined ? {} : { name: payload.name }),
        ...(payload.city === undefined ? {} : { city: payload.city }),
        ...(payload.state === undefined ? {} : { state: payload.state }),
        ...(payload.active === undefined ? {} : { active: payload.active }),
      },
    });
  }

  async listSettings(): Promise<AppSetting[]> {
    return this.prisma.appSetting.findMany({
      orderBy: [{ category: "asc" }, { settingKey: "asc" }],
    });
  }

  async upsertSettings(
    settings: Array<{ settingKey: string; category: string; value: unknown }>,
    updatedById?: string
  ): Promise<AppSetting[]> {
    return this.prisma.$transaction(async (tx) => {
      for (const setting of settings) {
        await tx.appSetting.upsert({
          where: { settingKey: setting.settingKey },
          update: {
            category: setting.category,
            value: setting.value as Prisma.InputJsonValue,
            updatedById,
          },
          create: {
            settingKey: setting.settingKey,
            category: setting.category,
            value: setting.value as Prisma.InputJsonValue,
            updatedById,
          },
        });
      }
      return tx.appSetting.findMany({
        orderBy: [{ category: "asc" }, { settingKey: "asc" }],
      });
    });
  }

  private toUserOrderBy(sortBy: AdminUserListQueryDto["sortBy"], sortOrder: AdminUserListQueryDto["sortOrder"]): Prisma.UserOrderByWithRelationInput {
    switch (sortBy) {
      case "createdAt":
        return { createdAt: sortOrder };
      case "name":
        return { name: sortOrder };
      case "email":
        return { email: sortOrder };
      case "role":
        return { role: sortOrder };
      default:
        return { updatedAt: sortOrder };
    }
  }
}
