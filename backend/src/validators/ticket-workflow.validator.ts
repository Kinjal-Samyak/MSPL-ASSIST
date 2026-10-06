import { ValidationError } from "../errors";
import type {
  ApproveAllSparePartRequestsDto,
  AssignServiceTlDto,
  CreateSparePartRequestsDto,
  CreateSparePartReturnRequestDto,
  DecideSparePartRequestDto,
  DecideSparePartReturnRequestDto,
  JobCardTransitionDto,
  RecordConsumedQuantityDto,
  RequireWorkshopDto,
  ResolveConsultationDto,
  ReturnSparePartsToInventoryDto,
  SaveJobCardDetailsDto,
  TicketCloseDecisionDto,
  TicketClosePaymentDto,
  TransferServiceTlDto,
} from "../dto/ticket-workflow.dto";

const PAYMENT_MODES = ["NEFT", "UPI"] as const;

export function validateTicketClosePaymentDto(input: unknown): TicketClosePaymentDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Payment details are required to close this ticket.");
  }
  const payload = input as Record<string, unknown>;
  const paymentMode = String(payload.paymentMode ?? "").trim().toUpperCase();
  if (!PAYMENT_MODES.includes(paymentMode as (typeof PAYMENT_MODES)[number])) {
    throw new ValidationError("Payment mode must be NEFT or UPI.");
  }
  const utrNumber = typeof payload.utrNumber === "string" ? payload.utrNumber.trim() : "";
  if (!utrNumber) {
    throw new ValidationError("UTR number is required.");
  }
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError("A valid payment amount is required.");
  }
  return { paymentMode: paymentMode as "NEFT" | "UPI", utrNumber, amount };
}

function normalizeOptionalRemarks(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError("remarks must be a string.");
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeRequiredId(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  return value.trim();
}

export function validateAssignServiceTlDto(input: unknown): AssignServiceTlDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Assign Service Engineer payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    serviceTlId: normalizeRequiredId(payload.serviceTlId, "serviceTlId"),
    remarks: normalizeOptionalRemarks(payload.remarks),
  };
}

export function validateTransferServiceTlDto(input: unknown): TransferServiceTlDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Transfer Service Engineer payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    serviceTlId: normalizeRequiredId(payload.serviceTlId, "serviceTlId"),
    remarks: normalizeOptionalRemarks(payload.remarks),
  };
}

export function validateResolveConsultationDto(input: unknown): ResolveConsultationDto {
  if (input == null) {
    return {};
  }

  if (typeof input !== "object") {
    throw new ValidationError("Resolve consultation payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    remarks: normalizeOptionalRemarks(payload.remarks),
  };
}

export function validateRequireWorkshopDto(input: unknown): RequireWorkshopDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Require workshop payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    technicianId: normalizeRequiredId(payload.technicianId, "technicianId"),
    remarks: normalizeOptionalRemarks(payload.remarks),
  };
}

function normalizeOptionalDate(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a valid date.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date.`);
  }

  return parsed.toISOString();
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

function normalizeOptionalNonNegativeNumber(value: unknown, fieldName: string): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number.`);
  }

  return parsed;
}

export function validateJobCardTransitionDto(input: unknown): JobCardTransitionDto {
  if (input == null) {
    return {};
  }

  if (typeof input !== "object") {
    throw new ValidationError("Job card transition payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    remarks: normalizeOptionalRemarks(payload.remarks),
    actualCompletionAt: normalizeOptionalDate(payload.actualCompletionAt, "actualCompletionAt"),
    completedByName: normalizeOptionalString(payload.completedByName, "completedByName"),
  };
}

export function validateSaveJobCardDetailsDto(input: unknown): SaveJobCardDetailsDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Job card details payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    initialObservation: normalizeOptionalString(payload.initialObservation, "initialObservation"),
    rootCause: normalizeOptionalString(payload.rootCause, "rootCause"),
    workPerformed: normalizeOptionalString(payload.workPerformed, "workPerformed"),
    otherRequirements: normalizeOptionalString(payload.otherRequirements, "otherRequirements"),
    technicianRemarks: normalizeOptionalString(payload.technicianRemarks, "technicianRemarks"),
    labourCharges: normalizeOptionalNonNegativeNumber(payload.labourCharges, "labourCharges"),
    partsCharges: normalizeOptionalNonNegativeNumber(payload.partsCharges, "partsCharges"),
    otherCharges: normalizeOptionalNonNegativeNumber(payload.otherCharges, "otherCharges"),
    totalCharges: normalizeOptionalNonNegativeNumber(payload.totalCharges, "totalCharges"),
    estimatedCompletionAt: normalizeOptionalDate(payload.estimatedCompletionAt, "estimatedCompletionAt"),
  };
}

export function validateTicketCloseDecisionDto(input: unknown): TicketCloseDecisionDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Ticket closure decision payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  if (payload.decision !== "YES" && payload.decision !== "NO") {
    throw new ValidationError("decision must be either YES or NO.");
  }

  const remarks = normalizeOptionalRemarks(payload.remarks);
  if (payload.decision === "NO" && !remarks) {
    throw new ValidationError("remarks are required when the ticket should remain open.");
  }

  return { decision: payload.decision, remarks };
}

export function validateJobCardPdfHistoryIdParam(pdfHistoryId: unknown): string {
  if (typeof pdfHistoryId !== "string") {
    throw new ValidationError("pdfHistoryId must be a valid string.");
  }

  const normalized = pdfHistoryId.trim();
  if (!normalized) {
    throw new ValidationError("pdfHistoryId is required.");
  }

  return normalized;
}

export function validateCreateSparePartRequestsDto(input: unknown): CreateSparePartRequestsDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Spare part request payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError("At least one spare part is required to submit a request.");
  }

  const items = payload.items.map((rawItem, index) => {
    if (rawItem == null || typeof rawItem !== "object") {
      throw new ValidationError(`items[${index}] must be an object.`);
    }
    const item = rawItem as Record<string, unknown>;
    const partId = normalizeRequiredId(item.partId, `items[${index}].partId`);
    const requestedQuantity =
      typeof item.requestedQuantity === "number" ? item.requestedQuantity : Number(item.requestedQuantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      throw new ValidationError(`items[${index}].requestedQuantity must be a positive integer.`);
    }
    return { partId, requestedQuantity };
  });

  return { items };
}

function normalizeOptionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function validateDecideSparePartRequestDto(input: unknown): DecideSparePartRequestDto {
  if (input == null) {
    return {};
  }

  if (typeof input !== "object") {
    throw new ValidationError("Decision payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    remarks: normalizeOptionalRemarks(payload.remarks),
    approvedQuantity: normalizeOptionalPositiveInteger(payload.approvedQuantity, "approvedQuantity"),
  };
}

export function validateSparePartRequestIdParam(requestId: unknown): string {
  return normalizeRequiredId(requestId, "requestId");
}

export function validateCreateSparePartReturnRequestDto(input: unknown): CreateSparePartReturnRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Return request payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const partId = normalizeRequiredId(payload.partId, "partId");
  const requestedReturnQuantity = typeof payload.requestedReturnQuantity === "number" ? payload.requestedReturnQuantity : Number(payload.requestedReturnQuantity);
  if (!Number.isInteger(requestedReturnQuantity) || requestedReturnQuantity <= 0) {
    throw new ValidationError("requestedReturnQuantity must be a positive integer.");
  }
  return { partId, requestedReturnQuantity };
}

export function validateDecideSparePartReturnRequestDto(input: unknown): DecideSparePartReturnRequestDto {
  if (input == null) {
    return {};
  }
  if (typeof input !== "object") {
    throw new ValidationError("Decision payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    remarks: normalizeOptionalRemarks(payload.remarks),
    approvedReturnQuantity: normalizeOptionalPositiveInteger(payload.approvedReturnQuantity, "approvedReturnQuantity"),
  };
}

export function validateRecordConsumedQuantityDto(input: unknown): RecordConsumedQuantityDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Consumption payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const partId = normalizeRequiredId(payload.partId, "partId");
  const consumedQuantity = typeof payload.consumedQuantity === "number" ? payload.consumedQuantity : Number(payload.consumedQuantity);
  if (!Number.isInteger(consumedQuantity) || consumedQuantity < 0) {
    throw new ValidationError("consumedQuantity must be a non-negative integer.");
  }
  return { partId, consumedQuantity };
}

export function validateApproveAllSparePartRequestsDto(input: unknown): ApproveAllSparePartRequestsDto {
  if (input == null) {
    return {};
  }
  if (typeof input !== "object") {
    throw new ValidationError("Approve-all payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  if (payload.items === undefined) {
    return {};
  }
  if (!Array.isArray(payload.items)) {
    throw new ValidationError("items must be an array.");
  }

  const items = payload.items.map((rawItem, index) => {
    if (rawItem == null || typeof rawItem !== "object") {
      throw new ValidationError(`items[${index}] must be an object.`);
    }
    const item = rawItem as Record<string, unknown>;
    const requestId = normalizeRequiredId(item.requestId, `items[${index}].requestId`);
    const approvedQuantity = normalizeOptionalPositiveInteger(item.approvedQuantity, `items[${index}].approvedQuantity`);
    return { requestId, approvedQuantity };
  });

  return { items };
}

export function validateReturnSparePartsToInventoryDto(input: unknown): ReturnSparePartsToInventoryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Return payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError("At least one part is required to return to inventory.");
  }

  const items = payload.items.map((rawItem, index) => {
    if (rawItem == null || typeof rawItem !== "object") {
      throw new ValidationError(`items[${index}] must be an object.`);
    }
    const item = rawItem as Record<string, unknown>;
    const partId = normalizeRequiredId(item.partId, `items[${index}].partId`);
    const returnQuantity = normalizeOptionalPositiveInteger(item.returnQuantity, `items[${index}].returnQuantity`);
    if (returnQuantity === undefined) {
      throw new ValidationError(`items[${index}].returnQuantity is required.`);
    }
    return { partId, returnQuantity };
  });

  const partIds = new Set<string>();
  for (const item of items) {
    if (partIds.has(item.partId)) {
      throw new ValidationError("Each part can only appear once in a single return request.");
    }
    partIds.add(item.partId);
  }

  return { items };
}
