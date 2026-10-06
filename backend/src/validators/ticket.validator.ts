import type {
  AssignTechnicianDto,
  CreateTicketDto,
  CreateTicketAttachmentDto,
  CreateTicketCommentDto,
  UpdateTicketChargesDto,
  UpdateTicketEtaDto,
  UpdateTicketStatusDto,
  TicketListQueryDto,
  TicketCommentType,
  TicketSortBy,
  ValidatedCreateTicketDto,
} from "../dto/ticket.dto";
import type { Priority, TicketSource } from "@prisma/client";
import { UnprocessableEntityError, ValidationError } from "../errors";
import { operationalPriorities, ticketSources } from "@mspl/shared-constants";
import { normalizePhoneNumber } from "@mspl/shared-utils";

const sourceValues: readonly TicketSource[] = ticketSources as readonly TicketSource[];
const priorityValues: readonly Priority[] = operationalPriorities as readonly Priority[];
const sortByValues: readonly TicketSortBy[] = [
  "createdAt",
  "updatedAt",
  "ticketNumber",
  "priority",
  "status",
  "customerName",
  "vehicleNumber",
  "eta",
];
const commentTypeValues: readonly TicketCommentType[] = ["INTERNAL", "TECHNICIAN", "CUSTOMER", "SYSTEM"];
const operationStatusValues = [
  "Open",
  "Assigned",
  "Inspection",
  "In Progress",
  "Waiting For Parts",
  "Ready",
  "Delivered",
  "Closed",
  "Cancelled",
] as const;
const allowedAttachmentTypes = ["image/jpeg", "image/png", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const maxCommentLength = 2000;

function normalizeMobile(mobile: unknown): string {
  if (typeof mobile !== "string" || !mobile.trim()) {
    throw new ValidationError("registeredMobile is required and must be a string.");
  }

  const digits = normalizePhoneNumber(mobile);

  if (digits.length < 7 || digits.length > 15) {
    throw new ValidationError("registeredMobile must contain 7 to 15 digits.");
  }

  return digits;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (value == null) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ValidationError(`${fieldName} cannot be empty.`);
  }

  return trimmed;
}

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

function normalizeNumber(value: unknown, fieldName: string): number | undefined {
  if (value == null) {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number.`);
  }

  if (parsed < 0) {
    throw new ValidationError(`${fieldName} cannot be negative.`);
  }

  return parsed;
}

function normalizeBoolean(value: unknown, defaultValue = false): boolean {
  if (value == null) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "false") {
    return value === "true";
  }

  throw new ValidationError("sendUpdate must be a boolean.");
}

function normalizeSource(value: unknown): TicketSource {
  if (value == null) {
    return "WHATSAPP";
  }

  if (typeof value !== "string") {
    throw new ValidationError("source must be a valid ticket source.");
  }

  const normalized = value.trim().toUpperCase() as TicketSource;

  if (!sourceValues.includes(normalized)) {
    throw new ValidationError("source must be one of WHATSAPP, PHONE, WALK_IN, ADMIN.");
  }

  return normalized;
}

function normalizePriority(value: unknown): Priority {
  if (value == null) {
    return "MEDIUM";
  }

  if (typeof value !== "string") {
    throw new ValidationError("priority must be a valid priority.");
  }

  const normalized = value.trim().toUpperCase() as Priority;

  if (!priorityValues.includes(normalized)) {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }

  return normalized;
}

function normalizeISODate(value: unknown, fieldName: string): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be an ISO date string.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid ISO date string.`);
  }

  return parsed.toISOString();
}

export function validateCreateTicketDto(input: unknown): ValidatedCreateTicketDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Ticket payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    registeredMobile: normalizeMobile(payload.registeredMobile),
    issueCategoryId: normalizeRequiredString(payload.issueCategoryId, "issueCategoryId"),
    issueDescription: normalizeRequiredString(payload.issueDescription, "issueDescription"),
    source: normalizeSource(payload.source),
    priority: normalizePriority(payload.priority),
    estimatedCharges: normalizeNumber(payload.estimatedCharges, "estimatedCharges"),
    finalCharges: normalizeNumber(payload.finalCharges, "finalCharges"),
    coordinatorNotes: normalizeOptionalString(payload.coordinatorNotes, "coordinatorNotes"),
    sendUpdate: normalizeBoolean(payload.sendUpdate, false),
    mvTrackNumber: normalizeOptionalString(payload.mvTrackNumber, "mvTrackNumber"),
    vehicleNumber: normalizeOptionalString(payload.vehicleNumber, "vehicleNumber"),
    eta: normalizeISODate(payload.eta, "eta"),
  };
}

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

function normalizeDate(value: unknown, fieldName: string): Date | undefined {
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

  return parsed;
}

function normalizeOptionalPriority(value: unknown): Priority | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }

  const normalized = value.trim().toUpperCase() as Priority;
  if (!priorityValues.includes(normalized)) {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }

  return normalized;
}

function normalizeSortBy(value: unknown): TicketSortBy {
  if (value == null || value === "") {
    return "createdAt";
  }

  if (typeof value !== "string") {
    throw new ValidationError(`sortBy must be one of ${sortByValues.join(", ")}.`);
  }

  const normalized = value.trim() as TicketSortBy;
  if (!sortByValues.includes(normalized)) {
    throw new ValidationError(`sortBy must be one of ${sortByValues.join(", ")}.`);
  }

  return normalized;
}

function normalizeSortOrder(value: unknown): "asc" | "desc" {
  if (value == null || value === "") {
    return "desc";
  }

  if (typeof value !== "string") {
    throw new ValidationError("sortOrder must be either asc or desc.");
  }

  const normalized = value.trim().toLowerCase();
  if (normalized !== "asc" && normalized !== "desc") {
    throw new ValidationError("sortOrder must be either asc or desc.");
  }

  return normalized;
}

export function validateTicketListQuery(input: unknown): TicketListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Ticket list query parameters must be an object.");
  }

  const query = input as Record<string, unknown>;
  const fromDate = normalizeDate(query.fromDate, "fromDate");
  const toDate = normalizeDate(query.toDate, "toDate");

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new ValidationError("fromDate cannot be later than toDate.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    status: normalizeOptionalString(query.status, "status"),
    priority: normalizeOptionalPriority(query.priority),
    hub: normalizeOptionalString(query.hub, "hub"),
    technician: normalizeOptionalString(query.technician, "technician"),
    category: normalizeOptionalString(query.category, "category"),
    vehicleType: normalizeOptionalString(query.vehicleType, "vehicleType"),
    vehicleModel: normalizeOptionalString(query.vehicleModel, "vehicleModel"),
    fromDate,
    toDate,
    sortBy: normalizeSortBy(query.sortBy),
    sortOrder: normalizeSortOrder(query.sortOrder),
  };
}

export function validateTicketIdParam(ticketId: unknown): string {
  if (typeof ticketId !== "string") {
    throw new ValidationError("ticketId must be a valid string.");
  }

  const normalized = ticketId.trim();
  if (!normalized) {
    throw new ValidationError("ticketId is required.");
  }

  return normalized;
}

function normalizeCommentType(value: unknown): TicketCommentType {
  if (typeof value !== "string") {
    throw new ValidationError("commentType is required and must be a string.");
  }

  const normalized = value.trim().toUpperCase() as TicketCommentType;
  if (!commentTypeValues.includes(normalized)) {
    throw new UnprocessableEntityError("commentType must be one of INTERNAL, TECHNICIAN, CUSTOMER, SYSTEM.");
  }

  return normalized;
}

function normalizeCommentText(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("text is required and must be a string.");
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError("text cannot be empty.");
  }

  if (normalized.length > maxCommentLength) {
    throw new UnprocessableEntityError(`text cannot exceed ${maxCommentLength} characters.`);
  }

  return normalized;
}

export function validateCreateTicketCommentDto(input: unknown): CreateTicketCommentDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Comment payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    commentType: normalizeCommentType(payload.commentType),
    text: normalizeCommentText(payload.text),
    userName: normalizeOptionalString(payload.userName, "userName"),
    userRole: normalizeOptionalString(payload.userRole, "userRole"),
  };
}

function normalizeAttachmentFileType(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("fileType is required and must be a string.");
  }

  const normalized = value.trim().toLowerCase();
  if (!allowedAttachmentTypes.includes(normalized)) {
    throw new UnprocessableEntityError(
      `fileType must be one of ${allowedAttachmentTypes.join(", ")}.`
    );
  }

  return normalized;
}

function normalizeAttachmentFileSize(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("fileSize must be a positive integer.");
  }

  return parsed;
}

export function validateCreateTicketAttachmentDto(input: unknown): CreateTicketAttachmentDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Attachment payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    fileName: normalizeRequiredString(payload.fileName, "fileName"),
    fileType: normalizeAttachmentFileType(payload.fileType),
    fileSize: normalizeAttachmentFileSize(payload.fileSize),
    uploadedBy: normalizeRequiredString(payload.uploadedBy, "uploadedBy"),
  };
}

function normalizeNonNegativeNumber(value: unknown, fieldName: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number.`);
  }

  return Number(parsed.toFixed(2));
}

export function validateAssignTechnicianDto(input: unknown): AssignTechnicianDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Assign technician payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  return {
    technicianId: normalizeRequiredString(payload.technicianId, "technicianId"),
    assignmentNotes: normalizeOptionalString(payload.assignmentNotes, "assignmentNotes"),
  };
}

export function validateUpdateTicketStatusDto(input: unknown): UpdateTicketStatusDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Status update payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  const status = normalizeRequiredString(payload.status, "status");
  const matched = operationStatusValues.find((value) => value.toLowerCase() === status.toLowerCase());

  if (!matched) {
    throw new UnprocessableEntityError(`status must be one of ${operationStatusValues.join(", ")}.`);
  }

  return {
    status: matched,
    remarks: normalizeOptionalString(payload.remarks, "remarks"),
  };
}

export function validateUpdateTicketEtaDto(input: unknown): UpdateTicketEtaDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("ETA update payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  const eta = normalizeISODate(payload.eta, "eta");

  if (!eta) {
    throw new ValidationError("eta is required.");
  }

  return {
    eta,
    reason: normalizeRequiredString(payload.reason, "reason"),
  };
}

export function validateUpdateTicketChargesDto(input: unknown): UpdateTicketChargesDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Charges update payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  const labourCharges = normalizeNonNegativeNumber(payload.labourCharges, "labourCharges");
  const partsCharges = normalizeNonNegativeNumber(payload.partsCharges, "partsCharges");
  const discount = normalizeNonNegativeNumber(payload.discount, "discount");
  const totalCharges = normalizeNonNegativeNumber(payload.totalCharges, "totalCharges");
  const computedTotal = Number((labourCharges + partsCharges - discount).toFixed(2));

  if (computedTotal !== totalCharges) {
    throw new UnprocessableEntityError("totalCharges must equal labourCharges + partsCharges - discount.");
  }

  return {
    labourCharges,
    partsCharges,
    discount,
    totalCharges,
  };
}
