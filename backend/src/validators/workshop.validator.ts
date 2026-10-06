import type { Priority } from "@prisma/client";
import { ValidationError } from "../errors";
import { operationalPriorities } from "@mspl/shared-constants";
import type {
  AssignWorkshopJobDto,
  CreateWorkshopJobDto,
  SortOrder,
  UpdateWorkshopJobDto,
  WorkshopJobListQueryDto,
  WorkshopJobSortBy,
  WorkshopTimelineQueryDto,
} from "../dto/workshop.dto";

const priorityValues: readonly Priority[] = operationalPriorities as readonly Priority[];
const sortByValues: readonly WorkshopJobSortBy[] = [
  "updatedAt",
  "createdAt",
  "ticketNumber",
  "status",
  "priority",
  "customerName",
  "vehicleNumber",
];

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} is required and must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${fieldName} cannot be empty.`);
  }
  return trimmed;
}

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

function normalizeOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number.`);
  }
  if (parsed < 0) {
    throw new ValidationError(`${fieldName} cannot be negative.`);
  }
  return Number(parsed.toFixed(2));
}

function normalizePriority(value: unknown): Priority {
  if (typeof value !== "string") {
    throw new ValidationError("priority is required and must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }
  const normalized = value.trim().toUpperCase() as Priority;
  if (!priorityValues.includes(normalized)) {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }
  return normalized;
}

function normalizeOptionalPriority(value: unknown): Priority | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  return normalizePriority(value);
}

function normalizeOptionalIsoDate(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be an ISO date string.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be an ISO date string.`);
  }
  return parsed.toISOString();
}

export function validateWorkshopJobIdParam(jobId: unknown): string {
  return normalizeRequiredString(jobId, "jobId");
}

export function validateWorkshopJobListQuery(input: unknown): WorkshopJobListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workshop job list query must be an object.");
  }

  const query = input as Record<string, unknown>;
  const sortByRaw = (normalizeOptionalString(query.sortBy, "sortBy") ?? "updatedAt") as WorkshopJobSortBy;
  if (!sortByValues.includes(sortByRaw)) {
    throw new ValidationError(`sortBy must be one of ${sortByValues.join(", ")}.`);
  }

  const sortOrderRaw = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    status: normalizeOptionalString(query.status, "status"),
    priority: normalizeOptionalPriority(query.priority),
    technicianId: normalizeOptionalString(query.technicianId, "technicianId"),
    hubName: normalizeOptionalString(query.hubName, "hubName"),
    sortBy: sortByRaw,
    sortOrder: sortOrderRaw as SortOrder,
  };
}

export function validateWorkshopTimelineQuery(input: unknown): WorkshopTimelineQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workshop timeline query must be an object.");
  }

  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
  };
}

export function validateCreateWorkshopJobDto(input: unknown): CreateWorkshopJobDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workshop create payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    deploymentId: normalizeRequiredString(payload.deploymentId, "deploymentId"),
    issueCategoryId: normalizeRequiredString(payload.issueCategoryId, "issueCategoryId"),
    issueDescription: normalizeRequiredString(payload.issueDescription, "issueDescription"),
    priority: normalizePriority(payload.priority),
    coordinatorNotes: normalizeOptionalString(payload.coordinatorNotes, "coordinatorNotes"),
    eta: normalizeOptionalIsoDate(payload.eta, "eta"),
    estimatedCharges: normalizeOptionalNumber(payload.estimatedCharges, "estimatedCharges"),
  };
}

export function validateUpdateWorkshopJobDto(input: unknown): UpdateWorkshopJobDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workshop update payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const normalized: UpdateWorkshopJobDto = {
    issueDescription: normalizeOptionalString(payload.issueDescription, "issueDescription"),
    coordinatorNotes: normalizeOptionalString(payload.coordinatorNotes, "coordinatorNotes"),
    eta: normalizeOptionalIsoDate(payload.eta, "eta"),
    estimatedCharges: normalizeOptionalNumber(payload.estimatedCharges, "estimatedCharges"),
    finalCharges: normalizeOptionalNumber(payload.finalCharges, "finalCharges"),
    priority: normalizeOptionalPriority(payload.priority),
  };

  if (
    normalized.issueDescription == null &&
    normalized.coordinatorNotes == null &&
    normalized.eta == null &&
    normalized.estimatedCharges == null &&
    normalized.finalCharges == null &&
    normalized.priority == null
  ) {
    throw new ValidationError("At least one field must be provided for workshop job update.");
  }

  return normalized;
}

export function validateAssignWorkshopJobDto(input: unknown): AssignWorkshopJobDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workshop assign payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    technicianId: normalizeRequiredString(payload.technicianId, "technicianId"),
    assignmentNotes: normalizeOptionalString(payload.assignmentNotes, "assignmentNotes"),
  };
}
