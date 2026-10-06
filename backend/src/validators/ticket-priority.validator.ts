import type { Priority } from "@prisma/client";
import { operationalPriorities } from "@mspl/shared-constants";
import { ValidationError } from "../errors";
import type { UpdateTicketPriorityDto } from "../dto/ticket-priority.dto";

const priorityValues: readonly Priority[] = operationalPriorities as readonly Priority[];

export function validateUpdateTicketPriorityDto(input: unknown): UpdateTicketPriorityDto {
  if (!input || typeof input !== "object") throw new ValidationError("Priority update payload must be an object.");
  const body = input as Record<string, unknown>;

  if (typeof body.priority !== "string" || !body.priority.trim()) {
    throw new ValidationError("priority is required.");
  }
  const priority = body.priority.trim().toUpperCase();
  if (!priorityValues.includes(priority as Priority)) {
    throw new ValidationError("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  }

  if (typeof body.reason !== "string" || !body.reason.trim()) {
    throw new ValidationError("A reason is required to change ticket priority.");
  }

  return { priority, reason: body.reason.trim() };
}
