import { ValidationError } from "../errors";
import type {
  DeploymentListQueryDto,
  DeploymentSortBy,
  DeploymentQueryDto,
} from "../dto/deployment-module.dto";
import type { RentalStatus } from "@prisma/client";

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

export function validateDeploymentIdParam(deploymentId: unknown): string {
  const normalized = normalizeOptionalString(deploymentId, "deploymentId");
  if (!normalized) {
    throw new ValidationError("deploymentId is required.");
  }
  return normalized;
}

function parseRentalStatus(value: unknown): RentalStatus | undefined {
  const status = normalizeOptionalString(value, "rentalStatus");
  if (!status) {
    return undefined;
  }

  const normalized = status.toUpperCase() as RentalStatus;
  const allowed: RentalStatus[] = ["ACTIVE", "PENDING", "COMPLETED", "MAINTENANCE"];
  if (!allowed.includes(normalized)) {
    throw new ValidationError("rentalStatus must be ACTIVE, PENDING, COMPLETED, or MAINTENANCE.");
  }
  return normalized;
}

export function validateDeploymentListQuery(input: unknown): DeploymentListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Deployment list query must be an object.");
  }

  const query = input as Record<string, unknown>;
  const sortByRaw = (normalizeOptionalString(query.sortBy, "sortBy") ?? "updatedAt") as DeploymentSortBy;
  const allowedSortBy: DeploymentSortBy[] = [
    "updatedAt",
    "startedAt",
    "customerName",
    "vehicleNumber",
    "mvTrackNumber",
    "rentalStatus",
  ];
  if (!allowedSortBy.includes(sortByRaw)) {
    throw new ValidationError(
      "sortBy must be updatedAt, startedAt, customerName, vehicleNumber, mvTrackNumber, or rentalStatus."
    );
  }

  const sortOrderRaw = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    rentalStatus: parseRentalStatus(query.rentalStatus),
    hubName: normalizeOptionalString(query.hubName, "hubName"),
    modelCode: normalizeOptionalString(query.modelCode, "modelCode"),
    sortBy: sortByRaw,
    sortOrder: sortOrderRaw,
  };
}

export function validateDeploymentQuery(input: unknown): DeploymentQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Deployment query must be an object.");
  }

  const query = input as Record<string, unknown>;
  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
  };
}
