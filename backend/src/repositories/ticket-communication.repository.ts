import type { JobCardStage, Prisma, PrismaClient, TicketWorkflowStage } from "@prisma/client";
import { COMMUNICATION_CENTER_EVENT_TYPES, type CommunicationCenterEventType } from "../dto/notification.dto";

export interface TicketCommunicationTicketContext {
  id: string;
  ticketNumber: string;
  workflowStage: TicketWorkflowStage;
  statusName: string;
  updatedAt: Date;
  eta: Date | null;
  finalCharges: Prisma.Decimal | null;
  estimatedCharges: Prisma.Decimal | null;
  serviceTlId: string | null;
  serviceTlName: string | null;
  hub: string | null;
  customerName: string;
  primaryPhone: string;
  alternatePhone: string | null;
  jobCard: { technicianId: string; technicianName: string; workflowStage: JobCardStage; totalCharges: Prisma.Decimal | null } | null;
}

const ticketSelect = {
  id: true,
  ticketNumber: true,
  workflowStage: true,
  updatedAt: true,
  eta: true,
  finalCharges: true,
  estimatedCharges: true,
  serviceTlId: true,
  status: { select: { name: true } },
  serviceTl: { select: { name: true } },
  deployment: { select: { hub: { select: { name: true } } } },
  customer: { select: { name: true, registeredMobile: true, alternateMobile: true } },
  jobCard: { select: { technicianId: true, workflowStage: true, totalCharges: true, technician: { select: { name: true } } } },
} satisfies Prisma.TicketSelect;

type TicketRow = Prisma.TicketGetPayload<{ select: typeof ticketSelect }>;

export interface CommunicationLogRow {
  id: string;
  eventType: string;
  message: string;
  recipient: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  errorMessage: string | null;
  templateId: string | null;
  templateName: string | null;
  sentByName: string | null;
}

export class TicketCommunicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findTicketContext(ticketId: string): Promise<TicketCommunicationTicketContext | null> {
    const row = await this.prisma.ticket.findUnique({ where: { id: ticketId }, select: ticketSelect });
    if (!row) return null;
    return TicketCommunicationRepository.toContext(row);
  }

  private static toContext(row: TicketRow): TicketCommunicationTicketContext {
    return {
      id: row.id,
      ticketNumber: row.ticketNumber,
      workflowStage: row.workflowStage,
      statusName: row.status.name,
      updatedAt: row.updatedAt,
      eta: row.eta,
      finalCharges: row.finalCharges,
      estimatedCharges: row.estimatedCharges,
      serviceTlId: row.serviceTlId,
      serviceTlName: row.serviceTl?.name ?? null,
      hub: row.deployment?.hub?.name ?? null,
      customerName: row.customer.name,
      primaryPhone: row.customer.registeredMobile,
      alternatePhone: row.customer.alternateMobile,
      jobCard: row.jobCard
        ? {
            technicianId: row.jobCard.technicianId,
            technicianName: row.jobCard.technician.name,
            workflowStage: row.jobCard.workflowStage,
            totalCharges: row.jobCard.totalCharges,
          }
        : null,
    };
  }

  /** Event types that have at least one successful (not failed/pending) send for this ticket. */
  async findSentEventTypes(ticketId: string): Promise<Set<CommunicationCenterEventType>> {
    const rows = await this.prisma.notificationMessage.findMany({
      where: {
        sourceModule: "TICKET",
        sourceEntityId: ticketId,
        eventType: { in: COMMUNICATION_CENTER_EVENT_TYPES as string[] },
        status: { in: ["SENT", "DELIVERED", "READ"] },
      },
      select: { eventType: true },
      distinct: ["eventType"],
    });
    return new Set(rows.map((row) => row.eventType as CommunicationCenterEventType));
  }

  /** Most recent attempt (any status) per event type, for the per-event timeline summary. */
  async findLatestPerEventType(ticketId: string): Promise<Map<CommunicationCenterEventType, CommunicationLogRow>> {
    const rows = await this.prisma.notificationMessage.findMany({
      where: { sourceModule: "TICKET", sourceEntityId: ticketId, eventType: { in: COMMUNICATION_CENTER_EVENT_TYPES as string[] } },
      orderBy: { createdAt: "desc" },
      select: this.logSelect(),
    });
    const latest = new Map<CommunicationCenterEventType, CommunicationLogRow>();
    for (const row of rows) {
      const eventType = row.eventType as CommunicationCenterEventType;
      if (!latest.has(eventType)) {
        latest.set(eventType, TicketCommunicationRepository.toLogRow(row));
      }
    }
    return latest;
  }

  async findHistory(ticketId: string): Promise<CommunicationLogRow[]> {
    const rows = await this.prisma.notificationMessage.findMany({
      where: { sourceModule: "TICKET", sourceEntityId: ticketId },
      orderBy: { createdAt: "desc" },
      select: this.logSelect(),
    });
    return rows.map(TicketCommunicationRepository.toLogRow);
  }

  async findCommunicationById(communicationId: string): Promise<{ ticketId: string; eventType: string; recipient: string } | null> {
    const row = await this.prisma.notificationMessage.findUnique({
      where: { id: communicationId },
      select: { sourceModule: true, sourceEntityId: true, eventType: true, recipient: true },
    });
    if (!row || row.sourceModule !== "TICKET") return null;
    return { ticketId: row.sourceEntityId, eventType: row.eventType, recipient: row.recipient };
  }

  private logSelect() {
    return {
      id: true,
      eventType: true,
      message: true,
      recipient: true,
      status: true,
      sentAt: true,
      createdAt: true,
      errorMessage: true,
      templateId: true,
      template: { select: { name: true } },
      sentBy: { select: { name: true } },
    } satisfies Prisma.NotificationMessageSelect;
  }

  private static toLogRow(row: {
    id: string;
    eventType: string;
    message: string;
    recipient: string;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
    errorMessage: string | null;
    templateId: string | null;
    template: { name: string } | null;
    sentBy: { name: string } | null;
  }): CommunicationLogRow {
    return {
      id: row.id,
      eventType: row.eventType,
      message: row.message,
      recipient: row.recipient,
      status: row.status,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
      errorMessage: row.errorMessage,
      templateId: row.templateId,
      templateName: row.template?.name ?? null,
      sentByName: row.sentBy?.name ?? null,
    };
  }

  async findActiveTemplateForEvent(eventType: CommunicationCenterEventType): Promise<{ id: string; name: string } | null> {
    return this.prisma.notificationTemplate.findFirst({
      where: { eventType, channel: "WHATSAPP", active: true },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
    });
  }
}
