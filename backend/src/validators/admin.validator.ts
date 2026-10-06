import type { Role } from "@prisma/client";
import type {
  AdminAccessRole,
  AdminUserListQueryDto,
  AdminUserSortBy,
  CreateAdminHubDto,
  CreateAdminUserDto,
  ResetAdminUserPasswordDto,
  SortOrder,
  UpdateAdminHubDto,
  UpdateAdminSettingsDto,
  UpdateAdminUserDto,
} from "../dto/admin.dto";
import { ForbiddenError, ValidationError } from "../errors";
import { validatePasswordComplexity } from "../utils/password-policy";

const roleValues: readonly Role[] = ["ADMIN", "COORDINATOR", "TECHNICIAN", "SERVICE_TL", "SERVICE_MANAGER"];
const sortableValues: readonly AdminUserSortBy[] = ["updatedAt", "createdAt", "name", "email", "role"];

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalString(value, fieldName);
  if (!normalized) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  return normalized;
}

function normalizePositiveInteger(value: unknown, fieldName: string, defaultValue: number, max?: number): number {
  if (value == null || value === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }
  if (max && parsed > max) {
    throw new ValidationError(`${fieldName} cannot be greater than ${max}.`);
  }
  return parsed;
}

function normalizeRole(value: unknown, fieldName: string): Role {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be one of ADMIN, COORDINATOR, TECHNICIAN, SERVICE_TL.`);
  }
  const normalized = value.trim().toUpperCase() as Role;
  if (!roleValues.includes(normalized)) {
    throw new ValidationError(`${fieldName} must be one of ADMIN, COORDINATOR, TECHNICIAN, SERVICE_TL.`);
  }
  return normalized;
}

function normalizeOptionalRole(value: unknown, fieldName: string): Role | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  return normalizeRole(value, fieldName);
}

function normalizeOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  throw new ValidationError(`${fieldName} must be true or false.`);
}

function normalizeHubIds(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array.`);
  }
  const result = value
    .map((entry) => normalizeRequiredString(entry, `${fieldName}[]`))
    .filter((entry, index, all) => all.indexOf(entry) === index);
  if (result.length === 0) {
    throw new ValidationError(`${fieldName} must include at least one hub.`);
  }
  return result;
}

export function normalizeAccessRole(input: unknown): AdminAccessRole {
  return normalizeRole(input, "x-user-role");
}

export function ensureAdminOrCoordinator(role: AdminAccessRole): void {
  if (role === "TECHNICIAN") {
    throw new ForbiddenError("Technicians are not allowed to access Admin module.");
  }
}

/** Amendment 1 (Service Manager): Service Manager inherits every Administrator permission except
 * deleting a service ticket - user management, hub configuration and settings writes are not that
 * exception, so both roles pass here. This gate predates the Service Manager role and used a
 * custom x-user-role header check rather than the requireRoles middleware array, so it was missed
 * by the earlier pass that widened every other admin route to include SERVICE_MANAGER. */
export function ensureAdminOnly(role: AdminAccessRole): void {
  if (role !== "ADMIN" && role !== "SERVICE_MANAGER") {
    throw new ForbiddenError("Only an Administrator or Service Manager can modify admin configuration.");
  }
}

export function validateAdminUserIdParam(userId: unknown): string {
  return normalizeRequiredString(userId, "userId");
}

export function validateAdminHubIdParam(hubId: unknown): string {
  return normalizeRequiredString(hubId, "hubId");
}

export function validateAdminUserListQuery(input: unknown): AdminUserListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Admin users query must be an object.");
  }
  const query = input as Record<string, unknown>;
  const sortBy = (normalizeOptionalString(query.sortBy, "sortBy") ?? "updatedAt") as AdminUserSortBy;
  if (!sortableValues.includes(sortBy)) {
    throw new ValidationError(`sortBy must be one of ${sortableValues.join(", ")}.`);
  }
  const sortOrderRaw = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    role: normalizeOptionalRole(query.role, "role"),
    active: normalizeOptionalBoolean(query.active, "active"),
    hubId: normalizeOptionalString(query.hubId, "hubId"),
    sortBy,
    sortOrder: sortOrderRaw as SortOrder,
  };
}

export function validateCreateAdminUserDto(input: unknown): CreateAdminUserDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Create user payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const password = normalizeRequiredString(payload.password, "password");
  validatePasswordComplexity(password);
  return {
    name: normalizeRequiredString(payload.name, "name"),
    email: normalizeRequiredString(payload.email, "email").toLowerCase(),
    mobile: normalizeRequiredString(payload.mobile, "mobile"),
    role: normalizeRole(payload.role, "role"),
    hubIds: normalizeHubIds(payload.hubIds, "hubIds"),
    password,
    department: normalizeOptionalString(payload.department, "department"),
  };
}

export function validateUpdateAdminUserDto(input: unknown): UpdateAdminUserDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Update user payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const result: UpdateAdminUserDto = {
    name: normalizeOptionalString(payload.name, "name"),
    email: normalizeOptionalString(payload.email, "email")?.toLowerCase(),
    mobile: normalizeOptionalString(payload.mobile, "mobile"),
    role: normalizeOptionalRole(payload.role, "role"),
    hubIds: payload.hubIds == null ? undefined : normalizeHubIds(payload.hubIds, "hubIds"),
    department: normalizeOptionalString(payload.department, "department"),
  };

  if (Object.values(result).every((entry) => entry == null)) {
    throw new ValidationError("At least one field must be provided for user update.");
  }
  return result;
}

export function validateResetAdminUserPasswordDto(input: unknown): ResetAdminUserPasswordDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Reset password payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const password = normalizeRequiredString(payload.password, "password");
  validatePasswordComplexity(password);
  return { password };
}

export function validateCreateAdminHubDto(input: unknown): CreateAdminHubDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Create hub payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    name: normalizeRequiredString(payload.name, "name"),
    city: normalizeRequiredString(payload.city, "city"),
    state: normalizeRequiredString(payload.state, "state"),
  };
}

export function validateUpdateAdminHubDto(input: unknown): UpdateAdminHubDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Update hub payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const result: UpdateAdminHubDto = {
    name: normalizeOptionalString(payload.name, "name"),
    city: normalizeOptionalString(payload.city, "city"),
    state: normalizeOptionalString(payload.state, "state"),
    active: normalizeOptionalBoolean(payload.active, "active"),
  };
  if (Object.values(result).every((entry) => entry == null)) {
    throw new ValidationError("At least one field must be provided for hub update.");
  }
  return result;
}

export function validateUpdateAdminSettingsDto(input: unknown): UpdateAdminSettingsDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Settings payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  if (!Array.isArray(payload.settings) || payload.settings.length === 0) {
    throw new ValidationError("settings must be a non-empty array.");
  }

  const settings = payload.settings.map((item, index) => {
    if (item == null || typeof item !== "object") {
      throw new ValidationError(`settings[${index}] must be an object.`);
    }
    const entry = item as Record<string, unknown>;
    return {
      settingKey: normalizeRequiredString(entry.settingKey, `settings[${index}].settingKey`),
      category: normalizeRequiredString(entry.category, `settings[${index}].category`),
      value: entry.value,
    };
  });

  return { settings };
}
