import type { PrismaClient } from "@prisma/client";

export interface TicketPriorityContext {
  id: string;
  priority: string;
  serviceTlId: string | null;
  jobCard: { id: string; technicianId: string } | null;
}

export class TicketPriorityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findContext(ticketId: string): Promise<TicketPriorityContext | null> {
    return this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        priority: true,
        serviceTlId: true,
        jobCard: { select: { id: true, technicianId: true } },
      },
    });
  }

  /** Updates Ticket.priority (+ priorityDefinitionId, kept in sync) and writes the immutable
   * TicketPriorityChange row atomically. The legacy `priority` enum stays authoritative for every
   * existing screen/report - priorityDefinitionId is additive, new-code-only. */
  async changePriority(input: {
    ticketId: string;
    previousPriority: string;
    newPriority: string;
    newPriorityDefinitionId: string;
    reason: string;
    changedById: string;
    changedByRole: string;
    servicePolicyVersionId: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id: input.ticketId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { priority: input.newPriority as any, priorityDefinitionId: input.newPriorityDefinitionId },
      });

      const change = await tx.ticketPriorityChange.create({
        data: {
          ticketId: input.ticketId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          previousPriority: input.previousPriority as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newPriority: input.newPriority as any,
          reason: input.reason,
          changedById: input.changedById,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          changedByRole: input.changedByRole as any,
          servicePolicyVersionId: input.servicePolicyVersionId,
        },
      });

      return { ticket, change };
    });
  }

  listPriorityChanges(ticketId: string) {
    return this.prisma.ticketPriorityChange.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      include: { changedBy: { select: { name: true } } },
    });
  }
}
