import { ValidationError } from "../errors";
import type { WorkshopWorkbenchListQueryDto, WorkshopWorkbenchStatus } from "../dto/workshop-workbench.dto";

const STATUS_VALUES: readonly WorkshopWorkbenchStatus[] = ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "RFD"];
const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed || undefined;
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
    return max;
  }

  return parsed;
}

function normalizeOptionalStatus(value: unknown): WorkshopWorkbenchStatus | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError("status must be one of ASSIGNED, IN_PROGRESS, COMPLETED, RFD.");
  }

  const normalized = value.trim().toUpperCase() as WorkshopWorkbenchStatus;
  if (!STATUS_VALUES.includes(normalized)) {
    throw new ValidationError("status must be one of ASSIGNED, IN_PROGRESS, COMPLETED, RFD.");
  }

  return normalized;
}

function normalizeOptionalPriority(value: unknown): WorkshopWorkbenchListQueryDto["priority"] {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }

  const normalized = value.trim().toUpperCase() as WorkshopWorkbenchListQueryDto["priority"];
  if (!normalized || !PRIORITY_VALUES.includes(normalized)) {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }

  return normalized;
}

export function validateWorkshopWorkbenchListQuery(input: unknown): WorkshopWorkbenchListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workshop Workbench list query parameters must be an object.");
  }

  const query = input as Record<string, unknown>;

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    hub: normalizeOptionalString(query.hub, "hub"),
    technicianId: normalizeOptionalString(query.technicianId, "technicianId"),
    status: normalizeOptionalStatus(query.status),
    priority: normalizeOptionalPriority(query.priority),
  };
}
