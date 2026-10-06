import type {
  CreateNotificationTemplateDto,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  NotificationListQueryDto,
  NotificationSortBy,
  NotificationSourceModule,
  SendNotificationDto,
  UpdateNotificationSettingsDto,
  UpdateNotificationTemplateDto,
} from "../dto/notification.dto";
import { ValidationError } from "../errors";

const CHANNELS: readonly NotificationChannel[] = ["WHATSAPP", "SMS", "EMAIL", "IN_APP"];
const STATUSES: readonly NotificationDeliveryStatus[] = ["NOT_SENT", "SENT", "FAILED"];
const SOURCES: readonly NotificationSourceModule[] = [
  "TICKET",
  "CUSTOMER",
  "VEHICLE",
  "DEPLOYMENT",
  "WORKSHOP",
  "ADMIN",
];
const EVENT_TYPES: readonly NotificationEventType[] = [
  "TICKET_CREATED",
  "TICKET_ASSIGNED",
  "TICKET_CLOSED",
  "TICKET_STATUS_UPDATED",
  "TICKET_ETA_UPDATED",
  "TICKET_CHARGES_UPDATED",
  "WORKSHOP_ASSIGNED",
  "WORKSHOP_COMPLETED",
  "DEPLOYMENT_STARTED",
  "DEPLOYMENT_CLOSED",
  "CUSTOMER_CREATED",
  "VEHICLE_ACTIVATED",
  "VEHICLE_DEACTIVATED",
  "USER_CREATED",
  "USER_UPDATED",
  "REPAIR_STARTED",
  "WAITING_FOR_PARTS",
  "WORK_COMPLETED",
  "READY_FOR_DELIVERY",
  "TICKET_CANCELLED",
  "GENERAL_ANNOUNCEMENT",
  "VEHICLE_PENDING_PICKUP_REMINDER",
];
const SORT_FIELDS: readonly NotificationSortBy[] = [
  "createdAt",
  "updatedAt",
  "channel",
  "status",
  "eventType",
];

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalString(value, fieldName);
  if (!normalized) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  return normalized;
}

function normalizeOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  throw new ValidationError(`${fieldName} must be true or false.`);
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

function normalizeChannel(value: unknown, fieldName: string): NotificationChannel {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be one of ${CHANNELS.join(", ")}.`);
  }
  const normalized = value.trim().toUpperCase() as NotificationChannel;
  if (!CHANNELS.includes(normalized)) {
    throw new ValidationError(`${fieldName} must be one of ${CHANNELS.join(", ")}.`);
  }
  return normalized;
}

function normalizeOptionalChannel(value: unknown, fieldName: string): NotificationChannel | undefined {
  if (value == null || value === "") return undefined;
  return normalizeChannel(value, fieldName);
}

function normalizeStatus(value: unknown, fieldName: string): NotificationDeliveryStatus {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be one of ${STATUSES.join(", ")}.`);
  }
  const normalized = value.trim().toUpperCase() as NotificationDeliveryStatus;
  if (!STATUSES.includes(normalized)) {
    throw new ValidationError(`${fieldName} must be one of ${STATUSES.join(", ")}.`);
  }
  return normalized;
}

function normalizeOptionalStatus(value: unknown, fieldName: string): NotificationDeliveryStatus | undefined {
  if (value == null || value === "") return undefined;
  return normalizeStatus(value, fieldName);
}

function normalizeEventType(value: unknown, fieldName: string): NotificationEventType {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be one of ${EVENT_TYPES.join(", ")}.`);
  }
  const normalized = value.trim().toUpperCase() as NotificationEventType;
  if (!EVENT_TYPES.includes(normalized)) {
    throw new ValidationError(`${fieldName} must be one of ${EVENT_TYPES.join(", ")}.`);
  }
  return normalized;
}

function normalizeOptionalEventType(value: unknown, fieldName: string): NotificationEventType | undefined {
  if (value == null || value === "") return undefined;
  return normalizeEventType(value, fieldName);
}

function normalizeSource(value: unknown, fieldName: string): NotificationSourceModule {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be one of ${SOURCES.join(", ")}.`);
  }
  const normalized = value.trim().toUpperCase() as NotificationSourceModule;
  if (!SOURCES.includes(normalized)) {
    throw new ValidationError(`${fieldName} must be one of ${SOURCES.join(", ")}.`);
  }
  return normalized;
}

function normalizeSortBy(value: unknown): NotificationSortBy {
  const sortBy = (normalizeOptionalString(value, "sortBy") ?? "createdAt") as NotificationSortBy;
  if (!SORT_FIELDS.includes(sortBy)) {
    throw new ValidationError(`sortBy must be one of ${SORT_FIELDS.join(", ")}.`);
  }
  return sortBy;
}

export function validateNotificationIdParam(input: unknown): string {
  return normalizeRequiredString(input, "notificationId");
}

export function validateTemplateIdParam(input: unknown): string {
  return normalizeRequiredString(input, "templateId");
}

export function validateNotificationListQuery(input: unknown): NotificationListQueryDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Notifications query must be an object.");
  }
  const query = input as Record<string, unknown>;
  const sortOrderRaw = (normalizeOptionalString(query.sortOrder, "sortOrder") ?? "desc").toLowerCase();
  if (sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
    throw new ValidationError("sortOrder must be asc or desc.");
  }

  return {
    page: normalizePositiveInteger(query.page, "page", 1),
    pageSize: normalizePositiveInteger(query.pageSize, "pageSize", 10, 100),
    search: normalizeOptionalString(query.search, "search"),
    channel: normalizeOptionalChannel(query.channel, "channel"),
    status: normalizeOptionalStatus(query.status, "status"),
    eventType: normalizeOptionalEventType(query.eventType, "eventType"),
    archived: normalizeOptionalBoolean(query.archived, "archived"),
    sortBy: normalizeSortBy(query.sortBy),
    sortOrder: sortOrderRaw,
  };
}

export function validateSendNotificationDto(input: unknown): SendNotificationDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Send notification payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const message = normalizeOptionalString(payload.message, "message");
  const templateId = normalizeOptionalString(payload.templateId, "templateId");
  if (!message && !templateId) {
    throw new ValidationError("Either message or templateId is required.");
  }
  if (payload.variables != null && (typeof payload.variables !== "object" || Array.isArray(payload.variables))) {
    throw new ValidationError("variables must be an object.");
  }

  return {
    eventType: normalizeEventType(payload.eventType, "eventType"),
    sourceModule: normalizeSource(payload.sourceModule, "sourceModule"),
    sourceEntityId: normalizeRequiredString(payload.sourceEntityId, "sourceEntityId"),
    channel: normalizeChannel(payload.channel, "channel"),
    recipient: normalizeRequiredString(payload.recipient, "recipient"),
    message,
    templateId,
    variables: (payload.variables as Record<string, unknown> | undefined) ?? undefined,
    sentById: normalizeOptionalString(payload.sentById, "sentById"),
  };
}

export function validateCreateNotificationTemplateDto(input: unknown): CreateNotificationTemplateDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Create template payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    name: normalizeRequiredString(payload.name, "name"),
    eventType: normalizeEventType(payload.eventType, "eventType"),
    channel: normalizeChannel(payload.channel, "channel"),
    subject: normalizeOptionalString(payload.subject, "subject"),
    content: normalizeRequiredString(payload.content, "content"),
    active: normalizeOptionalBoolean(payload.active, "active"),
  };
}

export function validateUpdateNotificationTemplateDto(input: unknown): UpdateNotificationTemplateDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Update template payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const result: UpdateNotificationTemplateDto = {
    name: normalizeOptionalString(payload.name, "name"),
    channel: normalizeOptionalChannel(payload.channel, "channel"),
    subject: normalizeOptionalString(payload.subject, "subject"),
    content: normalizeOptionalString(payload.content, "content"),
    active: normalizeOptionalBoolean(payload.active, "active"),
  };
  if (Object.values(result).every((value) => value == null)) {
    throw new ValidationError("At least one field must be provided for template update.");
  }
  return result;
}

export function validateUpdateNotificationSettingsDto(input: unknown): UpdateNotificationSettingsDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Notification settings payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  if (!Array.isArray(payload.settings) || payload.settings.length === 0) {
    throw new ValidationError("settings must be a non-empty array.");
  }

  const settings = payload.settings.map((entry, index) => {
    if (entry == null || typeof entry !== "object") {
      throw new ValidationError(`settings[${index}] must be an object.`);
    }
    const item = entry as Record<string, unknown>;
    const maxRetries = normalizePositiveInteger(item.maxRetries, `settings[${index}].maxRetries`, 3, 10);
    return {
      channel: normalizeChannel(item.channel, `settings[${index}].channel`),
      enabled: normalizeOptionalBoolean(item.enabled, `settings[${index}].enabled`) ?? true,
      maxRetries,
    };
  });

  return { settings };
}
