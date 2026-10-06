import { ValidationError } from "../errors";
import type {
  ConsumptionGroupBy,
  ConsumptionSummaryQueryDto,
  CreatePartAdjustmentDto,
  CreatePartCategoryDto,
  CreatePartDto,
  CreatePartSubcategoryDto,
  PartCompatibilityDto,
  PartInventoryTransactionListQueryDto,
  PartListQueryDto,
  PartsInventoryUploadListQueryDto,
  PartTransactionTypeName,
  UpdatePartCategoryDto,
} from "../dto/parts.dto";

const TRANSACTION_TYPES: readonly PartTransactionTypeName[] = ["RECEIPT", "ISSUE", "RETURN", "ADJUSTMENT", "TRANSFER_OUT", "TRANSFER_IN", "WARRANTY_RETURN", "SCRAP"];
const GROUP_BY_VALUES: readonly ConsumptionGroupBy[] = ["MONTH", "HUB", "VEHICLE_MODEL", "TECHNICIAN", "PART", "JOB_CARD"];

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${field} is required.`);
  return value.trim();
};
const optionalString = (value: unknown, field: string): string | undefined => {
  if (value == null || value === "") return undefined;
  return requiredString(value, field);
};
const nonNegativeInteger = (value: unknown, field: string, fallback?: number): number | undefined => {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new ValidationError(`${field} must be a non-negative integer.`);
  return parsed;
};
const booleanValue = (value: unknown, field: string, fallback: boolean): boolean => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be a boolean.`);
  return value;
};

export function validateCreatePartCategory(input: unknown): CreatePartCategoryDto {
  if (!input || typeof input !== "object") throw new ValidationError("Part category payload must be an object.");
  const body = input as Record<string, unknown>;
  return { name: requiredString(body.name, "name"), description: optionalString(body.description, "description"), displayOrder: nonNegativeInteger(body.displayOrder, "displayOrder") };
}

export function validateCreatePartSubcategory(input: unknown): CreatePartSubcategoryDto {
  if (!input || typeof input !== "object") throw new ValidationError("Part subcategory payload must be an object.");
  const body = input as Record<string, unknown>;
  return { categoryId: requiredString(body.categoryId, "categoryId"), name: requiredString(body.name, "name"), description: optionalString(body.description, "description") };
}

function validateCompatibleModels(value: unknown): PartCompatibilityDto[] {
  const models = value ?? [];
  if (!Array.isArray(models)) throw new ValidationError("compatibleModels must be an array.");
  return models.map((model, index) => {
    if (!model || typeof model !== "object") throw new ValidationError(`compatibleModels[${index}] must be an object.`);
    const item = model as Record<string, unknown>;
    return { modelCode: requiredString(item.modelCode, `compatibleModels[${index}].modelCode`), modelName: requiredString(item.modelName, `compatibleModels[${index}].modelName`) };
  });
}

export function validateCreatePart(input: unknown): CreatePartDto {
  if (!input || typeof input !== "object") throw new ValidationError("Part payload must be an object.");
  const body = input as Record<string, unknown>;
  const partCost = Number(body.partCost);
  if (!Number.isFinite(partCost) || partCost < 0) throw new ValidationError("partCost must be a non-negative number.");
  return {
    partCode: requiredString(body.partCode, "partCode").toUpperCase(), partName: requiredString(body.partName, "partName"),
    description: optionalString(body.description, "description"), categoryId: requiredString(body.categoryId, "categoryId"), subcategoryId: optionalString(body.subcategoryId, "subcategoryId"),
    brand: optionalString(body.brand, "brand"), manufacturer: optionalString(body.manufacturer, "manufacturer"), oemPartNumber: optionalString(body.oemPartNumber, "oemPartNumber"), internalPartNumber: optionalString(body.internalPartNumber, "internalPartNumber"),
    unitOfMeasure: requiredString(body.unitOfMeasure, "unitOfMeasure"), partCost, warrantyEligible: booleanValue(body.warrantyEligible, "warrantyEligible", false), consumable: booleanValue(body.consumable, "consumable", false),
    minimumStock: nonNegativeInteger(body.minimumStock, "minimumStock", 0), reorderLevel: nonNegativeInteger(body.reorderLevel, "reorderLevel", 0), maximumStock: nonNegativeInteger(body.maximumStock, "maximumStock"), active: booleanValue(body.active, "active", true), remarks: optionalString(body.remarks, "remarks"),
    compatibleModels: validateCompatibleModels(body.compatibleModels),
  };
}

export function validateUpdatePartCategory(input: unknown): UpdatePartCategoryDto {
  if (!input || typeof input !== "object") throw new ValidationError("Part category update payload must be an object.");
  const body = input as Record<string, unknown>;
  return { categoryId: requiredString(body.categoryId, "categoryId"), compatibleModels: validateCompatibleModels(body.compatibleModels) };
}

export function validatePartListQuery(input: unknown): PartListQueryDto {
  const query = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const active = query.active == null || query.active === "" ? undefined : query.active === true || query.active === "true" ? true : query.active === false || query.active === "false" ? false : undefined;
  if (query.active != null && query.active !== "" && active === undefined) throw new ValidationError("active must be a boolean.");
  return { search: optionalString(query.search, "search"), categoryId: optionalString(query.categoryId, "categoryId"), active };
}

function positiveInteger(value: unknown, field: string, fallback: number, max?: number): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new ValidationError(`${field} must be a positive integer.`);
  return max && parsed > max ? max : parsed;
}

export function validateCreatePartAdjustment(input: unknown): CreatePartAdjustmentDto {
  if (!input || typeof input !== "object") throw new ValidationError("Adjustment payload must be an object.");
  const body = input as Record<string, unknown>;
  const quantityDelta = Number(body.quantityDelta);
  if (!Number.isInteger(quantityDelta) || quantityDelta === 0) throw new ValidationError("quantityDelta must be a non-zero integer.");
  return { quantityDelta, reason: requiredString(body.reason, "reason"), hubId: optionalString(body.hubId, "hubId") };
}

export function validateTransactionListQuery(input: unknown): PartInventoryTransactionListQueryDto {
  const query = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const transactionType = optionalString(query.transactionType, "transactionType") as PartTransactionTypeName | undefined;
  if (transactionType && !TRANSACTION_TYPES.includes(transactionType)) throw new ValidationError(`transactionType must be one of ${TRANSACTION_TYPES.join(", ")}.`);
  return {
    page: positiveInteger(query.page, "page", 1),
    pageSize: positiveInteger(query.pageSize, "pageSize", 20, 100),
    partId: optionalString(query.partId, "partId"),
    transactionType,
    hubId: optionalString(query.hubId, "hubId"),
    technicianId: optionalString(query.technicianId, "technicianId"),
    jobCardId: optionalString(query.jobCardId, "jobCardId"),
    dateFrom: optionalString(query.dateFrom, "dateFrom"),
    dateTo: optionalString(query.dateTo, "dateTo"),
  };
}

export function validateConsumptionSummaryQuery(input: unknown): ConsumptionSummaryQueryDto {
  const query = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const groupBy = requiredString(query.groupBy, "groupBy").toUpperCase() as ConsumptionGroupBy;
  if (!GROUP_BY_VALUES.includes(groupBy)) throw new ValidationError(`groupBy must be one of ${GROUP_BY_VALUES.join(", ")}.`);
  return {
    groupBy,
    dateFrom: optionalString(query.dateFrom, "dateFrom"),
    dateTo: optionalString(query.dateTo, "dateTo"),
    hubId: optionalString(query.hubId, "hubId"),
  };
}

export function validateUploadHistoryListQuery(input: unknown): PartsInventoryUploadListQueryDto {
  const query = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    page: positiveInteger(query.page, "page", 1),
    pageSize: positiveInteger(query.pageSize, "pageSize", 20, 100),
    dateFrom: optionalString(query.dateFrom, "dateFrom"),
    dateTo: optionalString(query.dateTo, "dateTo"),
  };
}
