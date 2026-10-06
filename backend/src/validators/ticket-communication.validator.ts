import { ValidationError } from "../errors";
import { COMMUNICATION_CENTER_EVENT_TYPES, type CommunicationCenterEventType } from "../dto/notification.dto";
import type {
  CommunicationRecipientType,
  ResendTicketCommunicationDto,
  SendTicketCommunicationDto,
} from "../dto/ticket-communication.dto";

const RECIPIENT_TYPES: readonly CommunicationRecipientType[] = ["PRIMARY", "ALTERNATE"];

/** Accepts a 10-digit mobile number, optionally prefixed with a country code (with or without a leading +). */
export function validatePhoneNumber(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  const normalized = value.trim().replace(/[\s-]/g, "");
  if (!/^\+?\d{10,15}$/.test(normalized)) {
    throw new ValidationError(`${fieldName} must be a valid 10-digit mobile number, optionally with a country code.`);
  }
  return normalized;
}

function normalizeEventType(value: unknown): CommunicationCenterEventType {
  if (typeof value !== "string" || !COMMUNICATION_CENTER_EVENT_TYPES.includes(value as CommunicationCenterEventType)) {
    throw new ValidationError(`eventType must be one of ${COMMUNICATION_CENTER_EVENT_TYPES.join(", ")}.`);
  }
  return value as CommunicationCenterEventType;
}

function normalizeRecipientType(value: unknown, fallback: CommunicationRecipientType = "PRIMARY"): CommunicationRecipientType {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string" || !RECIPIENT_TYPES.includes(value as CommunicationRecipientType)) {
    throw new ValidationError("recipientType must be PRIMARY or ALTERNATE.");
  }
  return value as CommunicationRecipientType;
}

export function validateSendTicketCommunicationDto(input: unknown): SendTicketCommunicationDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Send communication payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const eventType = normalizeEventType(payload.eventType);
  const recipient = validatePhoneNumber(payload.recipient, "recipient");
  const recipientType = normalizeRecipientType(payload.recipientType);
  const customMessage = typeof payload.customMessage === "string" ? payload.customMessage.trim() || undefined : undefined;

  if (eventType === "GENERAL_ANNOUNCEMENT" && !customMessage) {
    throw new ValidationError("customMessage is required for a General Announcement.");
  }

  return { eventType, recipient, recipientType, customMessage };
}

export function validateResendTicketCommunicationDto(input: unknown): ResendTicketCommunicationDto {
  if (input == null) return {};
  if (typeof input !== "object") {
    throw new ValidationError("Resend communication payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    recipient: payload.recipient == null || payload.recipient === "" ? undefined : validatePhoneNumber(payload.recipient, "recipient"),
    recipientType: payload.recipientType == null ? undefined : normalizeRecipientType(payload.recipientType),
  };
}

export function validateCommunicationIdParam(input: unknown): string {
  if (typeof input !== "string" || !input.trim()) {
    throw new ValidationError("communicationId is required.");
  }
  return input.trim();
}
