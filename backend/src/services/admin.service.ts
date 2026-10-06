import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { config } from "../config";
import { prismaClient } from "../database";
import type {
  AdminAccessRole,
  AdminDashboardDto,
  AdminHubDto,
  AdminMutationResponseDto,
  AdminPermissionDto,
  AdminRoleDto,
  AdminSettingDto,
  AdminUserDto,
  AdminUserListResponseDto,
} from "../dto/admin.dto";
import type { ExportResponseDto } from "../dto/report.dto";
import { ConflictError, NotFoundError } from "../errors";
import { AdminRepository } from "../repositories/admin.repository";
import { AuditLogService } from "./audit-log.service";
import {
  ensureAdminOnly,
  ensureAdminOrCoordinator,
  normalizeAccessRole,
  validateAdminHubIdParam,
  validateAdminUserIdParam,
  validateAdminUserListQuery,
  validateCreateAdminHubDto,
  validateCreateAdminUserDto,
  validateResetAdminUserPasswordDto,
  validateUpdateAdminHubDto,
  validateUpdateAdminSettingsDto,
  validateUpdateAdminUserDto,
} from "../validators/admin.validator";
import { AdminMapper } from "./admin.mapper";

const DEFAULT_SETTINGS: Array<{ settingKey: string; category: string; value: unknown; editableByAdmin: boolean }> = [
  { settingKey: "notifications.customerUpdatesEnabled", category: "Notification Settings", value: true, editableByAdmin: true },
  { settingKey: "notifications.whatsappChannelEnabled", category: "Notification Settings", value: true, editableByAdmin: true },
  { settingKey: "application.defaultTimezone", category: "Application Configuration", value: "Asia/Kolkata", editableByAdmin: true },
  { settingKey: "application.defaultPageSize", category: "Application Configuration", value: 10, editableByAdmin: true },
  { settingKey: "masters.hubUpdatesAllowed", category: "Master Settings", value: true, editableByAdmin: true },
];

export interface AdminActorContext {
  userId?: string;
  name?: string;
  role?: string;
}

export class AdminService {
  private readonly repository: AdminRepository;
  private readonly auditLog: AuditLogService;

  constructor(repository?: AdminRepository, auditLog?: AuditLogService) {
    this.repository = repository ?? new AdminRepository(prismaClient);
    this.auditLog = auditLog ?? new AuditLogService();
  }

  private async audit(
    entityType: string,
    entityId: string,
    action: string,
    actor: AdminActorContext | undefined,
    metadata?: Record<string, unknown>,
    reason?: string
  ): Promise<void> {
    await this.auditLog.record({
      entityType,
      entityId,
      action,
      performedById: actor?.userId ?? null,
      performedByName: actor?.name ?? null,
      performedByRole: actor?.role ?? null,
      reason: reason ?? null,
      metadata: metadata ?? null,
    });
  }

  async getDashboard(roleInput: unknown): Promise<AdminDashboardDto> {
    const role = this.requireReadRole(roleInput);
    void role;
    const permissions = AdminMapper.toPermissions();
    const roles = await this.repository.listRoles();
    const counts = await this.repository.getDashboardCounts(permissions.length, roles.length);
    return AdminMapper.toDashboard(counts);
  }

  async getUsers(roleInput: unknown, queryInput: unknown): Promise<AdminUserListResponseDto> {
    this.requireReadRole(roleInput);
    const query = validateAdminUserListQuery(queryInput);
    const { items, totalRecords } = await this.repository.listUsers(query);
    return AdminMapper.toUserList(items.map((item) => AdminMapper.toUser(item)), totalRecords, query.page, query.pageSize);
  }

  async createUser(roleInput: unknown, payloadInput: unknown, actor?: AdminActorContext): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const payload = validateCreateAdminUserDto(payloadInput);
    await this.assertHubsExist(payload.hubIds);

    try {
      const passwordHash = await bcrypt.hash(payload.password, config.auth.bcryptSaltRounds);
      const created = await this.repository.createUser(payload, passwordHash);
      await this.audit("User", created.id, "USER_CREATED", actor, { email: created.email, role: created.role });
      return AdminMapper.toMutationResponse("User created successfully.", created.updatedAt, { userId: created.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A user with the same email already exists.");
      }
      throw error;
    }
  }

  async getUserById(roleInput: unknown, userIdInput: unknown): Promise<AdminUserDto> {
    this.requireReadRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} was not found.`);
    }
    return AdminMapper.toUser(user);
  }

  async updateUser(
    roleInput: unknown,
    userIdInput: unknown,
    payloadInput: unknown,
    actor?: AdminActorContext
  ): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    const payload = validateUpdateAdminUserDto(payloadInput);
    await this.assertUserExists(userId);
    if (payload.hubIds) {
      await this.assertHubsExist(payload.hubIds);
    }

    try {
      const updated = await this.repository.updateUser(userId, payload);
      await this.audit("User", updated.id, "USER_UPDATED", actor, payload as Record<string, unknown>);
      return AdminMapper.toMutationResponse("User updated successfully.", updated.updatedAt, { userId: updated.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A user with the same email already exists.");
      }
      throw error;
    }
  }

  async activateUser(roleInput: unknown, userIdInput: unknown, actor?: AdminActorContext): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    await this.assertUserExists(userId);
    const updated = await this.repository.setUserActive(userId, true);
    await this.audit("User", updated.id, "USER_ACTIVATED", actor);
    return AdminMapper.toMutationResponse("User activated successfully.", updated.updatedAt, { userId: updated.id });
  }

  async deactivateUser(roleInput: unknown, userIdInput: unknown, actor?: AdminActorContext): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    await this.assertUserExists(userId);
    const updated = await this.repository.setUserActive(userId, false);
    await this.audit("User", updated.id, "USER_DEACTIVATED", actor);
    return AdminMapper.toMutationResponse("User deactivated successfully.", updated.updatedAt, { userId: updated.id });
  }

  /** Soft delete: preserves the user row (and therefore every historical FK reference to it -
   * assigned tickets, job cards, activities, etc.) and only marks it deletedAt + inactive, so it
   * drops out of every admin listing/picker without breaking history. Self-delete is blocked so an
   * Administrator or Service Manager can never lock themselves out. */
  async deleteUser(roleInput: unknown, userIdInput: unknown, actor?: AdminActorContext): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    if (actor?.userId && actor.userId === userId) {
      throw new ConflictError("You cannot delete your own account.");
    }
    await this.assertUserExists(userId);
    const deleted = await this.repository.softDeleteUser(userId);
    await this.audit("User", deleted.id, "USER_DELETED", actor, { email: deleted.email, role: deleted.role });
    return AdminMapper.toMutationResponse("User deleted successfully.", deleted.updatedAt, { userId: deleted.id });
  }

  async resetUserPassword(
    roleInput: unknown,
    userIdInput: unknown,
    payloadInput: unknown,
    actor?: AdminActorContext
  ): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    const payload = validateResetAdminUserPasswordDto(payloadInput);
    await this.assertUserExists(userId);
    const passwordHash = await bcrypt.hash(payload.password, config.auth.bcryptSaltRounds);
    const updated = await this.repository.resetPassword(userId, passwordHash);
    await this.audit("User", updated.id, "USER_PASSWORD_RESET", actor);
    return AdminMapper.toMutationResponse("Password reset successfully.", updated.updatedAt, { userId: updated.id });
  }

  async lockUser(roleInput: unknown, userIdInput: unknown, actor?: AdminActorContext): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    await this.assertUserExists(userId);
    const updated = await this.repository.setUserLocked(userId, true);
    await this.audit("User", updated.id, "USER_LOCKED", actor);
    return AdminMapper.toMutationResponse("User locked successfully.", updated.updatedAt, { userId: updated.id });
  }

  async unlockUser(roleInput: unknown, userIdInput: unknown, actor?: AdminActorContext): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const userId = validateAdminUserIdParam(userIdInput);
    await this.assertUserExists(userId);
    const updated = await this.repository.setUserLocked(userId, false);
    await this.audit("User", updated.id, "USER_UNLOCKED", actor);
    return AdminMapper.toMutationResponse("User unlocked successfully.", updated.updatedAt, { userId: updated.id });
  }

  async exportUsers(roleInput: unknown, actor?: AdminActorContext): Promise<ExportResponseDto> {
    this.requireWriteRole(roleInput);
    const rows = await this.repository.listAllUsersForExport();
    const users = rows.map((row) => AdminMapper.toUser(row));
    await this.audit("User", "ALL", "USERS_EXPORTED", actor, { count: users.length });
    return {
      fileName: `users-export-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: "text/csv",
      content: AdminMapper.toUsersCsv(users),
    };
  }

  async getRoles(roleInput: unknown): Promise<AdminRoleDto[]> {
    this.requireReadRole(roleInput);
    return AdminMapper.toRoles(await this.repository.listRoles());
  }

  async getPermissions(roleInput: unknown): Promise<AdminPermissionDto[]> {
    this.requireReadRole(roleInput);
    return AdminMapper.toPermissions();
  }

  async getHubs(roleInput: unknown): Promise<AdminHubDto[]> {
    this.requireReadRole(roleInput);
    const hubs = await this.repository.listHubs();
    return hubs.map((hub) => AdminMapper.toHub(hub));
  }

  async createHub(roleInput: unknown, payloadInput: unknown): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const payload = validateCreateAdminHubDto(payloadInput);
    const created = await this.repository.createHub(payload);
    return AdminMapper.toMutationResponse("Hub created successfully.", created.updatedAt, { hubId: created.id });
  }

  async updateHub(
    roleInput: unknown,
    hubIdInput: unknown,
    payloadInput: unknown
  ): Promise<AdminMutationResponseDto> {
    this.requireWriteRole(roleInput);
    const hubId = validateAdminHubIdParam(hubIdInput);
    const payload = validateUpdateAdminHubDto(payloadInput);
    const hub = await this.repository.findHubById(hubId);
    if (!hub) {
      throw new NotFoundError(`Hub with id ${hubId} was not found.`);
    }
    const updated = await this.repository.updateHub(hubId, payload);
    return AdminMapper.toMutationResponse("Hub updated successfully.", updated.updatedAt, { hubId: updated.id });
  }

  async getSettings(roleInput: unknown): Promise<AdminSettingDto[]> {
    this.requireReadRole(roleInput);
    const configured = await this.repository.listSettings();
    if (configured.length > 0) {
      return configured.map((setting) => AdminMapper.toSetting(setting));
    }
    return DEFAULT_SETTINGS.map((setting) =>
      AdminMapper.toSetting({
        ...setting,
        updatedAt: new Date(0),
      })
    );
  }

  async updateSettings(roleInput: unknown, payloadInput: unknown): Promise<AdminSettingDto[]> {
    const role = this.requireWriteRole(roleInput);
    const payload = validateUpdateAdminSettingsDto(payloadInput);
    const upserted = await this.repository.upsertSettings(payload.settings);
    void role;
    return upserted.map((setting) => AdminMapper.toSetting(setting));
  }

  private requireReadRole(roleInput: unknown): AdminAccessRole {
    const role = normalizeAccessRole(roleInput);
    ensureAdminOrCoordinator(role);
    return role;
  }

  private requireWriteRole(roleInput: unknown): AdminAccessRole {
    const role = normalizeAccessRole(roleInput);
    ensureAdminOnly(role);
    return role;
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} was not found.`);
    }
  }

  private async assertHubsExist(hubIds: string[]): Promise<void> {
    const hubs = await this.repository.listHubs();
    const existingIds = new Set(hubs.map((hub) => hub.id));
    const missing = hubIds.find((hubId) => !existingIds.has(hubId));
    if (missing) {
      throw new NotFoundError(`Hub with id ${missing} was not found.`);
    }
  }
}
