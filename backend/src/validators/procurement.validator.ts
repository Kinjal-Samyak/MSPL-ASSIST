import type { ProcurementRequestReason, ProcurementRequestStatus, PurchaseOrderStatus } from "@prisma/client";
import { ValidationError } from "../errors";
import type {
  CreateProcurementRequestInput,
  CreatePurchaseOrderInput,
  CreatePurchaseOrderLineInput,
  CreateSupplierInput,
  DecideProcurementRequestInput,
  ProcurementRequestListQueryDto,
  PurchaseOrderListQueryDto,
  SupplierListQueryDto,
  UpdatePurchaseOrderInput,
  UpdateSupplierInput,
} from "../dto/procurement.dto";

const PROCUREMENT_REQUEST_REASONS: ProcurementRequestReason[] = ["LOW_STOCK", "JOB_CARD_SHORTAGE", "MANUAL"];
const PROCUREMENT_REQUEST_STATUSES: ProcurementRequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CONVERTED_TO_PO", "CLOSED"];
const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = ["DRAFT", "ISSUED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

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

function normalizeRequiredPositiveInt(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive whole number.`);
  }
  return parsed;
}

function normalizeRequiredPositiveDecimal(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number.`);
  }
  return parsed;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return undefined;
}

function normalizePagination(input: Record<string, unknown>): { page: number; pageSize: number } {
  const page = Number(input.page) || 1;
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize) || 25));
  return { page: page > 0 ? page : 1, pageSize };
}

// ---------- Suppliers ----------

export function validateCreateSupplierInput(input: unknown): CreateSupplierInput {
  const body = (input ?? {}) as Record<string, unknown>;
  return {
    supplierCode: normalizeRequiredString(body.supplierCode, "supplierCode"),
    name: normalizeRequiredString(body.name, "name"),
    contactPerson: normalizeOptionalString(body.contactPerson, "contactPerson"),
    phone: normalizeOptionalString(body.phone, "phone"),
    email: normalizeOptionalString(body.email, "email"),
    address: normalizeOptionalString(body.address, "address"),
    gstNumber: normalizeOptionalString(body.gstNumber, "gstNumber"),
  };
}

export function validateUpdateSupplierInput(input: unknown): UpdateSupplierInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const result: UpdateSupplierInput = {
    name: body.name === undefined ? undefined : normalizeRequiredString(body.name, "name"),
    contactPerson: normalizeOptionalString(body.contactPerson, "contactPerson"),
    phone: normalizeOptionalString(body.phone, "phone"),
    email: normalizeOptionalString(body.email, "email"),
    address: normalizeOptionalString(body.address, "address"),
    gstNumber: normalizeOptionalString(body.gstNumber, "gstNumber"),
    active: normalizeOptionalBoolean(body.active),
  };
  return result;
}

export function validateSupplierListQuery(input: unknown): SupplierListQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const { page, pageSize } = normalizePagination(query);
  return { page, pageSize, search: normalizeOptionalString(query.search, "search"), active: normalizeOptionalBoolean(query.active) };
}

// ---------- Procurement Requests ----------

export function validateCreateProcurementRequestInput(input: unknown): CreateProcurementRequestInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const reason = body.reason === undefined ? undefined : (normalizeRequiredString(body.reason, "reason") as ProcurementRequestReason);
  if (reason && !PROCUREMENT_REQUEST_REASONS.includes(reason)) {
    throw new ValidationError(`reason must be one of: ${PROCUREMENT_REQUEST_REASONS.join(", ")}.`);
  }
  return {
    partId: normalizeRequiredString(body.partId, "partId"),
    requestedQuantity: normalizeRequiredPositiveInt(body.requestedQuantity, "requestedQuantity"),
    reason,
    jobCardId: normalizeOptionalString(body.jobCardId, "jobCardId"),
    remarks: normalizeOptionalString(body.remarks, "remarks"),
  };
}

export function validateDecideProcurementRequestInput(input: unknown): DecideProcurementRequestInput {
  const body = (input ?? {}) as Record<string, unknown>;
  return { remarks: normalizeOptionalString(body.remarks, "remarks") };
}

export function validateProcurementRequestListQuery(input: unknown): ProcurementRequestListQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const { page, pageSize } = normalizePagination(query);
  const status = query.status === undefined ? undefined : (normalizeRequiredString(query.status, "status") as ProcurementRequestStatus);
  if (status && !PROCUREMENT_REQUEST_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${PROCUREMENT_REQUEST_STATUSES.join(", ")}.`);
  }
  return { page, pageSize, status, partId: normalizeOptionalString(query.partId, "partId") };
}

// ---------- Purchase Orders ----------

function validatePurchaseOrderLineInput(raw: unknown, index: number): CreatePurchaseOrderLineInput {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError(`lines[${index}] must be an object.`);
  }
  const line = raw as Record<string, unknown>;
  return {
    partId: normalizeRequiredString(line.partId, `lines[${index}].partId`),
    procurementRequestId: normalizeOptionalString(line.procurementRequestId, `lines[${index}].procurementRequestId`),
    orderedQuantity: normalizeRequiredPositiveInt(line.orderedQuantity, `lines[${index}].orderedQuantity`),
    unitCost: normalizeRequiredPositiveDecimal(line.unitCost, `lines[${index}].unitCost`),
  };
}

function validatePurchaseOrderLines(raw: unknown, required: boolean): CreatePurchaseOrderLineInput[] | undefined {
  if (raw === undefined) {
    if (required) throw new ValidationError("lines is required.");
    return undefined;
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ValidationError("lines must be a non-empty array.");
  }
  return raw.map((line, index) => validatePurchaseOrderLineInput(line, index));
}

export function validateCreatePurchaseOrderInput(input: unknown): CreatePurchaseOrderInput {
  const body = (input ?? {}) as Record<string, unknown>;
  return {
    supplierId: normalizeRequiredString(body.supplierId, "supplierId"),
    expectedDeliveryDate: normalizeOptionalString(body.expectedDeliveryDate, "expectedDeliveryDate"),
    remarks: normalizeOptionalString(body.remarks, "remarks"),
    lines: validatePurchaseOrderLines(body.lines, true) as CreatePurchaseOrderLineInput[],
  };
}

export function validateUpdatePurchaseOrderInput(input: unknown): UpdatePurchaseOrderInput {
  const body = (input ?? {}) as Record<string, unknown>;
  return {
    expectedDeliveryDate: normalizeOptionalString(body.expectedDeliveryDate, "expectedDeliveryDate"),
    remarks: normalizeOptionalString(body.remarks, "remarks"),
    lines: validatePurchaseOrderLines(body.lines, false),
  };
}

export function validatePurchaseOrderListQuery(input: unknown): PurchaseOrderListQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const { page, pageSize } = normalizePagination(query);
  const status = query.status === undefined ? undefined : (normalizeRequiredString(query.status, "status") as PurchaseOrderStatus);
  if (status && !PURCHASE_ORDER_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${PURCHASE_ORDER_STATUSES.join(", ")}.`);
  }
  return { page, pageSize, status, supplierId: normalizeOptionalString(query.supplierId, "supplierId") };
}

export function requireIdParam(value: unknown, fieldName: string): string {
  return normalizeRequiredString(value, fieldName);
}
