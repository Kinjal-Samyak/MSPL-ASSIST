import { NotFoundError, ValidationError } from "../errors";
import type {
  CustomerSearchQueryDto,
  IssueSubcategoryQueryDto,
  TechnicianLookupQueryDto,
} from "../dto/lookup.dto";

function normalizePositiveInteger(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  max?: number
): number {
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

export function validateCustomerSearchQuery(input: unknown): CustomerSearchQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Rider search query must be an object.");
  }

  const query = input as Record<string, unknown>;

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
  };
}

export function validateCustomerIdParam(customerId: unknown): string {
  if (typeof customerId !== "string") {
    throw new ValidationError("customerId must be a valid string.");
  }

  const normalized = customerId.trim();
  if (!normalized) {
    throw new ValidationError("customerId is required.");
  }

  return normalized;
}

export function validateTechnicianLookupQuery(input: unknown): TechnicianLookupQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Technician lookup query must be an object.");
  }

  const query = input as Record<string, unknown>;
  const availability = normalizeOptionalString(query.availability, "availability");

  if (!availability) {
    return {
      hub: normalizeOptionalString(query.hub, "hub"),
    };
  }

  const normalizedAvailability = availability.toUpperCase();
  if (normalizedAvailability !== "AVAILABLE" && normalizedAvailability !== "BUSY") {
    throw new ValidationError("availability must be AVAILABLE or BUSY.");
  }

  return {
    hub: normalizeOptionalString(query.hub, "hub"),
    availability: normalizedAvailability,
  };
}

export function validateIssueSubcategoryQuery(input: unknown): IssueSubcategoryQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Issue subcategory query must be an object.");
  }

  const query = input as Record<string, unknown>;
  return {
    issueCategoryId: normalizeOptionalString(query.issueCategoryId, "issueCategoryId"),
  };
}

export function assertCustomerExists(
  customer: {
    id: string;
  } | null,
  customerId: string
): void {
  if (!customer) {
    throw new NotFoundError(`Rider with id ${customerId} was not found.`);
  }
}
