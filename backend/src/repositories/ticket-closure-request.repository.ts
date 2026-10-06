import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateTicketClosureRequestDto,
  TicketClosureRequestResponseDto,
} from "../dto/ticket-closure-request.dto";

const select = {
  id: true,
  ticketId: true,
  requestType: true,
  reasonCategory: true,
  reason: true,
  paymentWaived: true,
  paymentWaiveRemarks: true,
  paymentMode: true,
  paymentUtrNumber: true,
  paymentAmount: true,
  status: true,
  requestedById: true,
  requestedAt: true,
  decidedById: true,
  decidedAt: true,
  decisionRemarks: true,
  ticket: { select: { ticketNumber: true, serviceTlId: true } },
  requestedBy: { select: { name: true } },
  decidedBy: { select: { name: true } },
} satisfies Prisma.TicketClosureRequestSelect;

type ClosureRequestRow = Prisma.TicketClosureRequestGetPayload<{ select: typeof select }>;

export class TicketClosureRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findTicketContext(
    ticketId: string
  ): Promise<{ id: string; ticketNumber: string; serviceTlId: string | null; statusName: string } | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticketNumber: true, serviceTlId: true, status: { select: { name: true } } },
    });
    if (!ticket) return null;
    return { id: ticket.id, ticketNumber: ticket.ticketNumber, serviceTlId: ticket.serviceTlId, statusName: ticket.status.name };
  }

  async findPendingByTicketId(ticketId: string): Promise<{ id: string } | null> {
    return this.prisma.ticketClosureRequest.findFirst({
      where: { ticketId, status: "PENDING" },
      select: { id: true },
    });
  }

  async findById(id: string): Promise<ClosureRequestRow | null> {
    return this.prisma.ticketClosureRequest.findUnique({ where: { id }, select });
  }

  async create(
    ticketId: string,
    payload: CreateTicketClosureRequestDto,
    requestedById: string
  ): Promise<TicketClosureRequestResponseDto> {
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.ticketClosureRequest.create({
        data: {
          ticketId,
          requestType: payload.requestType,
          reasonCategory: payload.reasonCategory,
          reason: payload.reason,
          paymentWaived: payload.paymentWaived,
          paymentWaiveRemarks: payload.paymentWaiveRemarks,
          paymentMode: payload.paymentMode,
          paymentUtrNumber: payload.paymentUtrNumber,
          paymentAmount: payload.paymentAmount,
          requestedById,
        },
        select,
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType:
            payload.requestType === "CANCELLATION" ? "TICKET_CANCELLATION_REQUESTED" : "TICKET_EARLY_CLOSURE_REQUESTED",
          description:
            payload.requestType === "CANCELLATION"
              ? `Cancellation requested: ${payload.reason}`
              : `Early closure requested (${payload.reasonCategory}): ${payload.reason}`,
          performedById: requestedById,
          performedAt: new Date(),
          metadata: { requestId: row.id } as Prisma.InputJsonValue,
        },
      });

      return row;
    });

    return TicketClosureRequestRepository.toDto(created);
  }

  async listPendingForServiceTl(serviceTlId: string | null): Promise<TicketClosureRequestResponseDto[]> {
    const rows = await this.prisma.ticketClosureRequest.findMany({
      where: {
        status: "PENDING",
        ticket: serviceTlId ? { OR: [{ serviceTlId }, { serviceTlId: null }] } : undefined,
      },
      select,
      orderBy: { requestedAt: "asc" },
    });
    return rows.map(TicketClosureRequestRepository.toDto);
  }

  async listForTicket(ticketId: string): Promise<TicketClosureRequestResponseDto[]> {
    const rows = await this.prisma.ticketClosureRequest.findMany({
      where: { ticketId },
      select,
      orderBy: { requestedAt: "desc" },
    });
    return rows.map(TicketClosureRequestRepository.toDto);
  }

  async approve(
    requestId: string,
    ticketId: string,
    requestType: "CANCELLATION" | "EARLY_CLOSURE",
    targetStatusId: string,
    decidedById: string,
    remarks: string | undefined,
    payment: { paymentMode: string; utrNumber: string; amount: number } | null
  ): Promise<TicketClosureRequestResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.ticketClosureRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", decidedById, decidedAt: new Date(), decisionRemarks: remarks },
        select,
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          statusId: targetStatusId,
          closedAt: new Date(),
          ...(payment
            ? {
                paymentMode: payment.paymentMode,
                paymentUtrNumber: payment.utrNumber,
                paymentAmount: payment.amount,
                paymentRecordedAt: new Date(),
              }
            : {}),
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: requestType === "CANCELLATION" ? "TICKET_CANCELLATION_APPROVED" : "TICKET_EARLY_CLOSURE_APPROVED",
          description:
            requestType === "CANCELLATION"
              ? "Cancellation approved by Service Engineer. Ticket cancelled."
              : "Early closure approved by Service Engineer. Ticket closed; Job Card left untouched.",
          performedById: decidedById,
          performedAt: new Date(),
          metadata: { requestId, remarks: remarks ?? null } as Prisma.InputJsonValue,
        },
      });

      return row;
    });

    return TicketClosureRequestRepository.toDto(updated);
  }

  async reject(
    requestId: string,
    ticketId: string,
    requestType: "CANCELLATION" | "EARLY_CLOSURE",
    decidedById: string,
    remarks: string
  ): Promise<TicketClosureRequestResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.ticketClosureRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", decidedById, decidedAt: new Date(), decisionRemarks: remarks },
        select,
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: requestType === "CANCELLATION" ? "TICKET_CANCELLATION_REJECTED" : "TICKET_EARLY_CLOSURE_REJECTED",
          description: `${requestType === "CANCELLATION" ? "Cancellation" : "Early closure"} request rejected by Service Engineer: ${remarks}`,
          performedById: decidedById,
          performedAt: new Date(),
          metadata: { requestId, remarks } as Prisma.InputJsonValue,
        },
      });

      return row;
    });

    return TicketClosureRequestRepository.toDto(updated);
  }

  async findStatusIdByName(name: string): Promise<string | null> {
    const status = await this.prisma.statusMaster.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, active: true },
      select: { id: true },
    });
    return status?.id ?? null;
  }

  private static toDto(row: ClosureRequestRow): TicketClosureRequestResponseDto {
    return {
      id: row.id,
      ticketId: row.ticketId,
      ticketNumber: row.ticket.ticketNumber,
      requestType: row.requestType,
      reasonCategory: row.reasonCategory,
      reason: row.reason,
      paymentWaived: row.paymentWaived,
      paymentWaiveRemarks: row.paymentWaiveRemarks,
      paymentMode: row.paymentMode,
      paymentUtrNumber: row.paymentUtrNumber,
      paymentAmount: row.paymentAmount ? row.paymentAmount.toString() : null,
      status: row.status,
      requestedById: row.requestedById,
      requestedByName: row.requestedBy.name,
      requestedAt: row.requestedAt.toISOString(),
      decidedById: row.decidedById,
      decidedByName: row.decidedBy?.name ?? null,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      decisionRemarks: row.decisionRemarks,
    };
  }
}
