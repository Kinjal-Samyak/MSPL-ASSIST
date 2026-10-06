import type { ReportExportFormat, ReportQueryDto } from "../dto/report.dto";
import { ValidationError } from "../errors";

const EXPORT_FORMATS: readonly ReportExportFormat[] = ["CSV", "EXCEL", "PDF"];

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizePositiveInteger(value: unknown, fieldName: string, defaultValue: number, max?: number): number {
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

function normalizeDate(value: unknown, fieldName: string): string | undefined {
  const normalized = normalizeOptionalString(value, fieldName);
  if (!normalized) return undefined;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid ISO date.`);
  }
  return parsed.toISOString();
}

export function validateReportQuery(input: unknown): ReportQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Report query must be an object.");
  }
  const query = input as Record<string, unknown>;
  const sortOrder = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  const dateFrom = normalizeDate(query.dateFrom, "dateFrom");
  const dateTo = normalizeDate(query.dateTo, "dateTo");
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    throw new ValidationError("dateFrom cannot be greater than dateTo.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    dateFrom,
    dateTo,
    hubId: normalizeOptionalString(query.hubId, "hubId"),
    vehicleModelId: normalizeOptionalString(query.vehicleModelId, "vehicleModelId"),
    vehicle: normalizeOptionalString(query.vehicle, "vehicle"),
    technicianId: normalizeOptionalString(query.technicianId, "technicianId"),
    customerId: normalizeOptionalString(query.customerId, "customerId"),
    rider: normalizeOptionalString(query.rider, "rider"),
    status: normalizeOptionalString(query.status, "status"),
    category: normalizeOptionalString(query.category, "category"),
    priority: normalizeOptionalString(query.priority, "priority"),
    subcategory: normalizeOptionalString(query.subcategory, "subcategory"),
    ticketNumber: normalizeOptionalString(query.ticketNumber, "ticketNumber"),
    jobCardNumber: normalizeOptionalString(query.jobCardNumber, "jobCardNumber"),
    coordinatorId: normalizeOptionalString(query.coordinatorId, "coordinatorId"),
    serviceTlId: normalizeOptionalString(query.serviceTlId, "serviceTlId"),
    sortBy: normalizeOptionalString(query.sortBy, "sortBy") ?? "createdAt",
    sortOrder,
  };
}

export function validateExportFormat(input: unknown): ReportExportFormat {
  const normalized = normalizeOptionalString(input, "format")?.toUpperCase() as ReportExportFormat | undefined;
  if (!normalized || !EXPORT_FORMATS.includes(normalized)) {
    throw new ValidationError(`format must be one of ${EXPORT_FORMATS.join(", ")}.`);
  }
  return normalized;
}
