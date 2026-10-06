import { ValidationError } from "../errors";
import type {
  VehicleDocumentQueryDto,
  VehicleListQueryDto,
  VehicleSortBy,
  VehicleTimelineQueryDto,
} from "../dto/vehicle.dto";
import type { OperationalVehicleStatus } from "../dto/operational-provider.dto";

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

export function validateVehicleIdParam(vehicleId: unknown): string {
  const vehicleIdValue = normalizeOptionalString(vehicleId, "vehicleId");
  if (!vehicleIdValue) {
    throw new ValidationError("vehicleId is required.");
  }
  return vehicleIdValue;
}

function parseVehicleStatus(value: unknown): OperationalVehicleStatus | undefined {
  const status = normalizeOptionalString(value, "status");
  if (!status) {
    return undefined;
  }

  const normalized = status.toUpperCase() as OperationalVehicleStatus;
  const allowed: OperationalVehicleStatus[] = [
    "AVAILABLE",
    "DEPLOYED",
    "WORKSHOP",
    "RESERVED",
    "MAINTENANCE",
    "INACTIVE",
    "UNKNOWN",
  ];
  if (!allowed.includes(normalized)) {
    throw new ValidationError("status must be AVAILABLE, DEPLOYED, WORKSHOP, RESERVED, MAINTENANCE, INACTIVE, or UNKNOWN.");
  }
  return normalized;
}

export function validateVehicleListQuery(input: unknown): VehicleListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Vehicle list query must be an object.");
  }

  const query = input as Record<string, unknown>;
  const sortByRaw = (normalizeOptionalString(query.sortBy, "sortBy") ?? "updatedAt") as VehicleSortBy;
  const allowedSortBy: VehicleSortBy[] = ["updatedAt", "vehicleNumber", "mvTrackNumber", "status", "hubName"];
  if (!allowedSortBy.includes(sortByRaw)) {
    throw new ValidationError("sortBy must be updatedAt, vehicleNumber, mvTrackNumber, status, or hubName.");
  }

  const sortOrderRaw = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    status: parseVehicleStatus(query.status),
    hubName: normalizeOptionalString(query.hubName, "hubName"),
    modelCode: normalizeOptionalString(query.modelCode, "modelCode"),
    sortBy: sortByRaw,
    sortOrder: sortOrderRaw,
  };
}

export function validateVehicleTimelineQuery(input: unknown): VehicleTimelineQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Vehicle timeline query must be an object.");
  }
  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
  };
}

export function validateVehicleDocumentQuery(input: unknown): VehicleDocumentQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Vehicle document query must be an object.");
  }
  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    fileType: normalizeOptionalString(query.fileType, "fileType"),
  };
}

