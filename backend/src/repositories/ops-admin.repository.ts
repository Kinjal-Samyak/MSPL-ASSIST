import type { Prisma, PrismaClient } from "@prisma/client";
import type { ActivityTimelineQueryDto, OpsAdminTicketSearchQueryDto, ReassignTicketDto } from "../dto/ops-admin.dto";

const ticketRowSelect = {
  id: true,
  ticketNumber: true,
  priority: true,
  workflowStage: true,
  createdAt: true,
  closedAt: true,
  deletedAt: true,
  deleteReason: true,
  deletedByName: true,
  customer: { select: { name: true, registeredMobile: true } },
  status: { select: { name: true } },
  assignedTo: { select: { name: true } },
  serviceTl: { select: { name: true } },
} satisfies Prisma.TicketSelect;

export type OpsAdminTicketRow = Prisma.TicketGetPayload<{ select: typeof ticketRowSelect }>;

export class OpsAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async searchTickets(query: OpsAdminTicketSearchQueryDto): Promise<{ items: OpsAdminTicketRow[]; totalRecords: number }> {
    const conditions: Prisma.TicketWhereInput[] = [];

    if (query.onlyDeleted) {
      conditions.push({ deletedAt: { not: null } });
    } else if (!query.includeDeleted) {
      conditions.push({ deletedAt: null });
    }

    if (query.search) {
      conditions.push({
        OR: [
          { ticketNumber: { contains: query.search, mode: "insensitive" } },
          { customer: { name: { contains: query.search, mode: "insensitive" } } },
          { customer: { registeredMobile: { contains: query.search } } },
        ],
      });
    }

    const where: Prisma.TicketWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        select: ticketRowSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findTicketForOps(ticketId: string): Promise<OpsAdminTicketRow | null> {
    return this.prisma.ticket.findUnique({ where: { id: ticketId }, select: ticketRowSelect });
  }

  async softDeleteTicket(ticketId: string, reason: string, deletedByName: string, performedById?: string): Promise<OpsAdminTicketRow> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { deletedAt: new Date(), deleteReason: reason, deletedByName },
        select: ticketRowSelect,
      });
      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "TICKET_SOFT_DELETED",
          description: `Ticket soft-deleted by administrator. Reason: ${reason}`,
          performedById,
          performedAt: new Date(),
          metadata: { reason },
        },
      });
      return updated;
    });
  }

  async restoreTicket(ticketId: string, performedById?: string): Promise<OpsAdminTicketRow> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { deletedAt: null, deleteReason: null, deletedByName: null },
        select: ticketRowSelect,
      });
      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "TICKET_RESTORED",
          description: "Ticket restored by administrator.",
          performedById,
          performedAt: new Date(),
        },
      });
      return updated;
    });
  }

  async forceCloseTicket(ticketId: string, reason: string, performedById?: string): Promise<OpsAdminTicketRow> {
    return this.prisma.$transaction(async (tx) => {
      const closedStatus = await tx.statusMaster.findFirst({ where: { name: { equals: "Closed", mode: "insensitive" } } });
      if (!closedStatus) {
        throw new Error("Closed status master entry was not found.");
      }
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { statusId: closedStatus.id, closedAt: new Date() },
        select: ticketRowSelect,
      });
      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "TICKET_FORCE_CLOSED",
          description: `Ticket force-closed by administrator. Reason: ${reason}`,
          performedById,
          performedAt: new Date(),
          metadata: { reason },
        },
      });
      return updated;
    });
  }

  async reassignTicket(ticketId: string, payload: ReassignTicketDto, performedById?: string): Promise<OpsAdminTicketRow> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ...(payload.serviceTlId ? { serviceTlId: payload.serviceTlId } : {}),
          ...(payload.technicianId ? { assignedToId: payload.technicianId } : {}),
        },
        select: ticketRowSelect,
      });
      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "TICKET_REASSIGNED",
          description: "Ticket reassigned by administrator.",
          performedById,
          performedAt: new Date(),
          metadata: { serviceTlId: payload.serviceTlId ?? null, technicianId: payload.technicianId ?? null },
        },
      });
      return updated;
    });
  }

  async searchActivityTimeline(
    query: ActivityTimelineQueryDto
  ): Promise<{ items: Array<Prisma.TicketActivityGetPayload<{ include: { ticket: { select: { ticketNumber: true } }; performedBy: { select: { name: true } } } }>>; totalRecords: number }> {
    const conditions: Prisma.TicketActivityWhereInput[] = [];

    if (query.ticketNumber) {
      conditions.push({ ticket: { ticketNumber: { contains: query.ticketNumber, mode: "insensitive" } } });
    }
    if (query.activityType) {
      conditions.push({ activityType: query.activityType });
    }
    if (query.dateFrom || query.dateTo) {
      conditions.push({
        performedAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      });
    }

    const where: Prisma.TicketActivityWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketActivity.findMany({
        where,
        include: {
          ticket: { select: { ticketNumber: true } },
          performedBy: { select: { name: true } },
        },
        orderBy: { performedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ticketActivity.count({ where }),
    ]);

    return { items, totalRecords };
  }
}
