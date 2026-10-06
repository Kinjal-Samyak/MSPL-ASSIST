import { Prisma, type PrismaClient } from "@prisma/client";
import { prismaClient } from "../database";

interface TransactionClientLike {
  user: PrismaClient["user"];
  appSetting: PrismaClient["appSetting"];
}

export interface BootstrapCreateInput {
  companyName: string;
  adminName: string;
  email: string;
  passwordHash: string;
}

export interface BootstrapCreateResult {
  userId: string;
  initializedAt: Date;
}

export class SetupRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  async createInitialAdmin(input: BootstrapCreateInput): Promise<BootstrapCreateResult> {
    const appSettingExists = await this.hasAppSettingTable();

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.adminName,
          email: input.email,
          mobile: input.email,
          passwordHash: input.passwordHash,
          role: "ADMIN",
          active: true,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      if (appSettingExists) {
        await this.upsertCompanyName(tx, input.companyName, user.id);
      }

      return user;
    });

    return {
      userId: created.id,
      initializedAt: created.createdAt,
    };
  }

  private async hasAppSettingTable(): Promise<boolean> {
    const result = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(
      Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'AppSetting'
        ) AS "exists"
      `
    );
    return result[0]?.exists === true;
  }

  private async upsertCompanyName(
    tx: TransactionClientLike,
    companyName: string,
    updatedById: string
  ): Promise<void> {
    await tx.appSetting.upsert({
      where: {
        settingKey: "application.companyName",
      },
      update: {
        category: "Application Configuration",
        value: companyName as Prisma.InputJsonValue,
        updatedById,
        editableByAdmin: true,
      },
      create: {
        settingKey: "application.companyName",
        category: "Application Configuration",
        value: companyName as Prisma.InputJsonValue,
        updatedById,
        editableByAdmin: true,
      },
    });
  }
}
