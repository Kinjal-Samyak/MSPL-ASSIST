import { ForbiddenError, NotFoundError } from "../errors";
import { prismaClient } from "../database";
import { auditLogService } from "./audit-log.service";
import { TicketPriorityRepository } from "../repositories/ticket-priority.repository";
import { validateUpdateTicketPriorityDto } from "../validators/ticket-priority.validator";
import type { TicketPriorityChangeDto, TicketPriorityUpdateResponseDto } from "../dto/ticket-priority.dto";

export interface TicketPriorityActor {
  userId: string;
  role: string;
}

/** Frozen lock rules: a Coordinator may change priority only before a Service Engineer is assigned; the
 * assigned Service Engineer may change it only before a Technician is assigned; once a Technician is
 * assigned, priority is permanently locked for everyone (no Admin override, matching the spec
 * literally - Admin is not in the frozen "may change priority" role list at all, just like
 * Technician isn't). */
function assertCanChangePriority(actor: TicketPriorityActor, context: { serviceTlId: string | null; jobCard: { id: string } | null }): void {
  if (actor.role === "COORDINATOR") {
    if (context.serviceTlId !== null) {
      throw new ForbiddenError("Priority can only be changed by the Coordinator before a Service Engineer is assigned.");
    }
    return;
  }
  if (actor.role === "SERVICE_TL") {
    if (context.jobCard !== null) {
      throw new ForbiddenError("Priority can only be changed by the Service Engineer before a Technician is assigned.");
    }
    return;
  }
  throw new ForbiddenError("Only the Coordinator (before Service Engineer assignment) or the assigned Service Engineer (before Technician assignment) may change ticket priority.");
}

export class TicketPriorityService {
  constructor(private readonly repository = new TicketPriorityRepository(prismaClient)) {}

  async updatePriority(ticketId: string, actor: TicketPriorityActor, input: unknown): Promise<TicketPriorityUpdateResponseDto> {
    const payload = validateUpdateTicketPriorityDto(input);

    const context = await this.repository.findContext(ticketId);
    if (!context) throw new NotFoundError("Ticket was not found.");

    if (actor.role === "SERVICE_TL" && context.serviceTlId !== null && context.serviceTlId !== actor.userId) {
      throw new ForbiddenError("Only the assigned Service Engineer may change this ticket's priority.");
    }

    assertCanChangePriority(actor, context);

    const priorityDefinition = await prismaClient.priorityDefinition.findFirst({ where: { legacyValue: payload.priority as never } });
    if (!priorityDefinition) throw new NotFoundError(`No Priority Definition is configured for ${payload.priority}.`);
    const currentVersion = await prismaClient.servicePolicyVersion.findFirst({ where: { isCurrent: true } });

    const { change } = await this.repository.changePriority({
      ticketId,
      previousPriority: context.priority,
      newPriority: payload.priority,
      newPriorityDefinitionId: priorityDefinition.id,
      reason: payload.reason,
      changedById: actor.userId,
      changedByRole: actor.role,
      servicePolicyVersionId: currentVersion?.id ?? null,
    });

    await auditLogService.record({
      entityType: "Ticket.Priority",
      entityId: ticketId,
      action: "PRIORITY_CHANGED",
      performedById: actor.userId,
      performedByRole: actor.role,
      reason: payload.reason,
      metadata: { previousPriority: context.priority, newPriority: payload.priority },
    });

    return {
      ticketId,
      priority: payload.priority,
      change: toDto(change),
    };
  }

  async listPriorityChanges(ticketId: string): Promise<TicketPriorityChangeDto[]> {
    const rows = await this.repository.listPriorityChanges(ticketId);
    return rows.map(toDto);
  }
}

function toDto(row: {
  id: string;
  previousPriority: string;
  newPriority: string;
  reason: string;
  changedByRole: string;
  createdAt: Date;
  changedBy?: { name: string };
}): TicketPriorityChangeDto {
  return {
    id: row.id,
    previousPriority: row.previousPriority,
    newPriority: row.newPriority,
    reason: row.reason,
    changedByName: row.changedBy?.name ?? "",
    changedByRole: row.changedByRole,
    createdAt: row.createdAt.toISOString(),
  };
}
