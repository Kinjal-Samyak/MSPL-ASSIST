import type { CustomerStatus, RentalStatus, Role } from "@prisma/client";
import { NotFoundError, ValidationError } from "../errors";
import type {
  CreateCustomerDto,
  CustomerDocumentQueryDto,
  CustomerListQueryDto,
  CustomerRentalHistoryQueryDto,
  CustomerTimelineQueryDto,
  DeactivateCustomerDto,
  UpdateCustomerDto,
} from "../dto/customer-module.dto";

function normalizePositiveInteger(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  max?: number
): number {
  if (value == null || value === "") return defaultValue;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }
  if (max && parsed > max) {
    throw new ValidationError(`${fieldName} cannot be greater than ${max}.`);
  }
  return parsed;
}

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} cannot be longer than ${maxLength} characters.`);
  }
  return trimmed;
}

function normalizeOptionalMobile(value: unknown, fieldName: string): string | undefined {
  const normalized = normalizeOptionalString(value, fieldName);
  if (!normalized) return undefined;
  if (!/^\d{10,15}$/.test(normalized)) {
    throw new ValidationError(`${fieldName} must contain 10 to 15 digits.`);
  }
  return normalized;
}

function normalizeOptionalEmail(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value, "email");
  if (!normalized) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError("email must be a valid email address.");
  }
  return normalized.toLowerCase();
}

function parseCustomerStatus(value: unknown): CustomerStatus | undefined {
  const normalized = normalizeOptionalString(value, "status");
  if (!normalized) return undefined;
  const status = normalized.toUpperCase();
  if (status !== "ACTIVE" && status !== "INACTIVE" && status !== "SUSPENDED") {
    throw new ValidationError("status must be ACTIVE, INACTIVE, or SUSPENDED.");
  }
  return status;
}

function parseRole(value: unknown): Role | undefined {
  const normalized = normalizeOptionalString(value, "viewerRole");
  if (!normalized) return undefined;
  const role = normalized.toUpperCase();
  if (role !== "ADMIN" && role !== "COORDINATOR" && role !== "TECHNICIAN") {
    throw new ValidationError("viewerRole must be ADMIN, COORDINATOR, or TECHNICIAN.");
  }
  return role;
}

function parseRentalStatus(value: unknown): RentalStatus | undefined {
  const normalized = normalizeOptionalString(value, "rentalStatus");
  if (!normalized) return undefined;
  const status = normalized.toUpperCase();
  if (
    status !== "ACTIVE" &&
    status !== "PENDING" &&
    status !== "COMPLETED" &&
    status !== "MAINTENANCE"
  ) {
    throw new ValidationError("rentalStatus must be ACTIVE, PENDING, COMPLETED, or MAINTENANCE.");
  }
  return status;
}

export function validateCustomerModuleIdParam(customerId: unknown): string {
  return normalizeRequiredString(customerId, "customerId", 1, 128);
}

export function validateCustomerListQuery(input: unknown): CustomerListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Rider list query must be an object.");
  }
  const query = input as Record<string, unknown>;
  const sortByRaw = normalizeOptionalString(query.sortBy, "sortBy") ?? "updatedAt";
  if (!["name", "createdAt", "updatedAt"].includes(sortByRaw)) {
    throw new ValidationError("sortBy must be name, createdAt, or updatedAt.");
  }
  const sortOrderRaw = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    status: parseCustomerStatus(query.status),
    sortBy: sortByRaw as CustomerListQueryDto["sortBy"],
    sortOrder: sortOrderRaw as CustomerListQueryDto["sortOrder"],
    viewerRole: parseRole(query.viewerRole),
    viewerUserId: normalizeOptionalString(query.viewerUserId, "viewerUserId"),
  };
}

export function validateCreateCustomerDto(input: unknown): CreateCustomerDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Create rider payload must be an object.");
  }
  const body = input as Record<string, unknown>;
  const registeredMobile = normalizeRequiredString(body.registeredMobile, "registeredMobile", 10, 15);
  if (!/^\d{10,15}$/.test(registeredMobile)) {
    throw new ValidationError("registeredMobile must contain 10 to 15 digits.");
  }

  return {
    customerName: normalizeRequiredString(body.customerName, "customerName", 3, 120),
    registeredMobile,
    alternateMobile: normalizeOptionalMobile(body.alternateMobile, "alternateMobile"),
    whatsAppNumber: normalizeOptionalMobile(body.whatsAppNumber, "whatsAppNumber"),
    email: normalizeOptionalEmail(body.email),
    address: normalizeOptionalString(body.address, "address"),
  };
}

export function validateUpdateCustomerDto(input: unknown): UpdateCustomerDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Update rider payload must be an object.");
  }
  const body = input as Record<string, unknown>;

  const payload: UpdateCustomerDto = {};
  if (body.customerName != null) {
    payload.customerName = normalizeRequiredString(body.customerName, "customerName", 3, 120);
  }
  if (body.registeredMobile != null) {
    payload.registeredMobile = normalizeRequiredString(body.registeredMobile, "registeredMobile", 10, 15);
    if (!/^\d{10,15}$/.test(payload.registeredMobile)) {
      throw new ValidationError("registeredMobile must contain 10 to 15 digits.");
    }
  }
  if (body.alternateMobile != null) {
    payload.alternateMobile = normalizeOptionalMobile(body.alternateMobile, "alternateMobile");
  }
  if (body.whatsAppNumber != null) {
    payload.whatsAppNumber = normalizeOptionalMobile(body.whatsAppNumber, "whatsAppNumber");
  }
  if (body.email != null) {
    payload.email = normalizeOptionalEmail(body.email);
  }
  if (body.address != null) {
    payload.address = normalizeOptionalString(body.address, "address");
  }
  if (body.status != null) {
    payload.status = parseCustomerStatus(body.status);
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError("At least one field is required for rider update.");
  }

  return payload;
}

export function validateDeactivateCustomerDto(input: unknown): DeactivateCustomerDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Deactivate rider payload must be an object.");
  }
  const body = input as Record<string, unknown>;
  return {
    reason: normalizeRequiredString(body.reason, "reason", 5, 300),
  };
}

export function validateCustomerTimelineQuery(input: unknown): CustomerTimelineQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Rider timeline query must be an object.");
  }
  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
  };
}

export function validateCustomerRentalHistoryQuery(input: unknown): CustomerRentalHistoryQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Rider rental history query must be an object.");
  }
  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    rentalStatus: parseRentalStatus(query.rentalStatus),
    hub: normalizeOptionalString(query.hub, "hub"),
    search: normalizeOptionalString(query.search, "search"),
  };
}

export function validateCustomerDocumentQuery(input: unknown): CustomerDocumentQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Rider document query must be an object.");
  }
  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    fileType: normalizeOptionalString(query.fileType, "fileType"),
  };
}

export function assertCustomerModuleExists<T extends { id: string }>(
  customer: T | null,
  customerId: string
): asserts customer is T {
  if (!customer) {
    throw new NotFoundError(`Rider with id ${customerId} was not found.`);
  }
}
