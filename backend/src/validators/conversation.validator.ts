import type { ConversationRequestDto } from "../dto/conversation.dto";
import { ValidationError } from "../errors";
import { ConversationCommand, getConversationCommand } from "../conversations/conversation.command";

function normalizeWhatsAppNumber(number: unknown): string {
  if (typeof number !== "string" || !number.trim()) {
    throw new ValidationError("whatsappNumber is required and must be a string.");
  }

  const digits = number.replace(/[^0-9]/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new ValidationError("whatsappNumber must contain 7 to 15 digits.");
  }

  return digits;
}

function normalizeMessage(message: unknown): string {
  if (message == null) {
    throw new ValidationError("message is required.");
  }

  if (typeof message !== "string") {
    throw new ValidationError("message must be a string.");
  }

  const trimmed = message.trim();

  if (!trimmed) {
    throw new ValidationError("message cannot be empty.");
  }

  return trimmed;
}

export function validateConversationRequest(input: unknown): ConversationRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Conversation request payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  return {
    whatsappNumber: normalizeWhatsAppNumber(payload.whatsappNumber),
    message: normalizeMessage(payload.message),
  };
}

export function detectCommand(message: string): ConversationCommand | null {
  return getConversationCommand(message);
}
