import type { PrismaClient, Role } from "@prisma/client";

export interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  passwordHash: string | null;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  lockedAt: Date | null;
  failedLoginAttempts: number;
}

const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  passwordHash: true,
  refreshTokenHash: true,
  refreshTokenExpiresAt: true,
  lockedAt: true,
  failedLoginAttempts: true,
} as const;

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: AUTH_USER_SELECT,
    });
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });
  }

  async registerFailedLogin(userId: string, lockThreshold: number): Promise<{ failedLoginAttempts: number; locked: boolean }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
      select: { failedLoginAttempts: true, lockedAt: true },
    });

    if (user.failedLoginAttempts >= lockThreshold && !user.lockedAt) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedAt: new Date() },
      });
      return { failedLoginAttempts: user.failedLoginAttempts, locked: true };
    }

    return { failedLoginAttempts: user.failedLoginAttempts, locked: user.lockedAt !== null };
  }

  async registerSuccessfulLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
      },
    });
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }
}

