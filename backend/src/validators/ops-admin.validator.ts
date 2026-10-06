import type {
  ActivityTimelineQueryDto,
  DeleteTicketWithReasonDto,
  ForceCloseTicketDto,
  OpsAdminTicketSearchQueryDto,
  ReassignTicketDto,
} from "../dto/ops-admin.dto";
import { ValidationError } from "../errors";

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  return value.trim();
}

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  return value.trim() || undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}

export function validateOpsAdminTicketSearchQuery(input: unknown): OpsAdminTicketSearchQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const page = Number(query.page) || 1;
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));

  return {
    page: page > 0 ? page : 1,
    pageSize,
    search: normalizeOptionalString(query.search, "search"),
    includeDeleted: normalizeOptionalBoolean(query.includeDeleted),
    onlyDeleted: normalizeOptionalBoolean(query.onlyDeleted),
  };
}

export function validateDeleteTicketWithReasonDto(input: unknown): DeleteTicketWithReasonDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Delete payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return { reason: normalizeRequiredString(payload.reason, "reason") };
}

export function validateForceCloseTicketDto(input: unknown): ForceCloseTicketDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Force close payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return { reason: normalizeRequiredString(payload.reason, "reason") };
}

export function validateActivityTimelineQuery(input: unknown): ActivityTimelineQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const page = Number(query.page) || 1;
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));

  return {
    page: page > 0 ? page : 1,
    pageSize,
    ticketNumber: normalizeOptionalString(query.ticketNumber, "ticketNumber"),
    activityType: normalizeOptionalString(query.activityType, "activityType"),
    dateFrom: normalizeOptionalString(query.dateFrom, "dateFrom"),
    dateTo: normalizeOptionalString(query.dateTo, "dateTo"),
  };
}

export function validateReassignTicketDto(input: unknown): ReassignTicketDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Reassign payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const serviceTlId = normalizeOptionalString(payload.serviceTlId, "serviceTlId");
  const technicianId = normalizeOptionalString(payload.technicianId, "technicianId");
  if (!serviceTlId && !technicianId) {
    throw new ValidationError("At least one of serviceTlId or technicianId is required.");
  }
  return { serviceTlId, technicianId };
}
