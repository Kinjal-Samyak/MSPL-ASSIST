import { prismaClient } from "../database";
import { TicketCommunicationRepository, type CommunicationLogRow } from "../repositories/ticket-communication.repository";
import { NotificationService } from "./notification.service";
import {
  computeCommunicationHealth,
  computeSuggestedCommunicationEvent,
  getAvailableCommunicationEvents,
} from "../utils/communication-center";
import {
  validateCommunicationIdParam,
  validateResendTicketCommunicationDto,
  validateSendTicketCommunicationDto,
} from "../validators/ticket-communication.validator";
import { validateTicketIdParam } from "../validators/ticket.validator";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import type { CommunicationCenterEventType } from "../dto/notification.dto";
import type {
  TicketCommunicationCenterDto,
  TicketCommunicationHistoryItemDto,
  TicketCommunicationMutationResponseDto,
} from "../dto/ticket-communication.dto";
import type { WorkflowActor } from "./ticket-workflow.service";

const COMMUNICATION_EVENT_LABELS: Record<CommunicationCenterEventType, string> = {
  TICKET_CREATED: "Ticket Created",
  TICKET_ASSIGNED: "Ticket Assigned",
  REPAIR_STARTED: "Repair Started",
  WAITING_FOR_PARTS: "Waiting For Parts",
  WORK_COMPLETED: "Work Completed",
  READY_FOR_DELIVERY: "Ready For Delivery",
  TICKET_CHARGES_UPDATED: "Service Charges Updated",
  TICKET_CLOSED: "Ticket Closed",
  TICKET_CANCELLED: "Ticket Cancelled",
  GENERAL_ANNOUNCEMENT: "General Announcement",
  VEHICLE_PENDING_PICKUP_REMINDER: "Vehicle Pending Pickup Reminder",
};

export class TicketCommunicationService {
  private readonly repository: TicketCommunicationRepository;
  private readonly notificationService: NotificationService;

  constructor(
    private readonly prisma = prismaClient,
    repository?: TicketCommunicationRepository,
    notificationService?: NotificationService
  ) {
    this.repository = repository ?? new TicketCommunicationRepository(this.prisma);
    this.notificationService = notificationService ?? new NotificationService();
  }

  async getCommunicationCenter(ticketIdInput: unknown, actor: WorkflowActor): Promise<TicketCommunicationCenterDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const ticket = await this.repository.findTicketContext(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }
    this.assertCanView(ticket, actor);

    const availability = getAvailableCommunicationEvents({
      workflowStage: ticket.workflowStage,
      jobCardStage: ticket.jobCard?.workflowStage ?? null,
      statusName: ticket.statusName,
    });
    const [sentEventTypes, latestPerEvent, history] = await Promise.all([
      this.repository.findSentEventTypes(ticketId),
      this.repository.findLatestPerEventType(ticketId),
      this.repository.findHistory(ticketId),
    ]);

    const suggestedEvent = computeSuggestedCommunicationEvent(availability, sentEventTypes);
    const health = computeCommunicationHealth({
      suggestedEvent,
      stageEnteredAt: ticket.updatedAt,
    });

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      customerName: ticket.customerName,
      primaryPhone: ticket.primaryPhone,
      alternatePhone: ticket.alternatePhone,
      events: availability.map((entry) => {
        const latest = latestPerEvent.get(entry.eventType);
        return {
          eventType: entry.eventType,
          enabled: entry.enabled,
          reason: entry.reason,
          lastStatus: latest?.status ?? null,
          lastSentAt: latest?.sentAt ? latest.sentAt.toISOString() : null,
          lastRecipient: latest?.recipient ?? null,
        };
      }),
      suggestedEvent,
      suggestedReason: suggestedEvent
        ? `Customer has not yet been informed about the latest status: ${COMMUNICATION_EVENT_LABELS[suggestedEvent]}.`
        : null,
      health,
      history: history.map(TicketCommunicationService.toHistoryItem),
    };
  }

  /** Coordinator/Admin only - sends a fresh update for a currently-enabled event. */
  async sendCommunication(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketCommunicationMutationResponseDto> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "COORDINATOR") {
      throw new ForbiddenError("Only a Coordinator can send a customer communication.");
    }
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateSendTicketCommunicationDto(input);

    const ticket = await this.repository.findTicketContext(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }

    const availability = getAvailableCommunicationEvents({
      workflowStage: ticket.workflowStage,
      jobCardStage: ticket.jobCard?.workflowStage ?? null,
      statusName: ticket.statusName,
    });
    const eventStatus = availability.find((entry) => entry.eventType === payload.eventType);
    if (!eventStatus?.enabled) {
      throw new ConflictError(`${COMMUNICATION_EVENT_LABELS[payload.eventType]} is not available for this ticket right now.`);
    }

    const template = await this.repository.findActiveTemplateForEvent(payload.eventType);
    if (!template) {
      throw new NotFoundError(
        `No active WhatsApp template is configured for ${COMMUNICATION_EVENT_LABELS[payload.eventType]}. Create one in the Notifications module first.`
      );
    }

    const result = await this.notificationService.sendNotification({
      eventType: payload.eventType,
      sourceModule: "TICKET",
      sourceEntityId: ticketId,
      channel: "WHATSAPP",
      recipient: payload.recipient,
      templateId: template.id,
      variables: this.buildVariables(ticket, payload.customMessage),
      sentById: actor.userId,
    });

    return { communicationId: result.notificationId, status: "SUCCESS", message: result.message };
  }

  /** Coordinator/Admin only - re-sends a previous communication, recomputing the message from current ticket state. */
  async resendCommunication(
    communicationIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketCommunicationMutationResponseDto> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "COORDINATOR") {
      throw new ForbiddenError("Only a Coordinator can resend a customer communication.");
    }
    const communicationId = validateCommunicationIdParam(communicationIdInput);
    const payload = validateResendTicketCommunicationDto(input);

    const original = await this.repository.findCommunicationById(communicationId);
    if (!original) {
      throw new NotFoundError(`Communication with id ${communicationId} was not found.`);
    }
    const eventType = original.eventType as CommunicationCenterEventType;

    const ticket = await this.repository.findTicketContext(original.ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${original.ticketId} was not found.`);
    }

    const template = await this.repository.findActiveTemplateForEvent(eventType);
    if (!template) {
      throw new NotFoundError(
        `No active WhatsApp template is configured for ${COMMUNICATION_EVENT_LABELS[eventType]}. Create one in the Notifications module first.`
      );
    }

    const result = await this.notificationService.sendNotification({
      eventType,
      sourceModule: "TICKET",
      sourceEntityId: ticket.id,
      channel: "WHATSAPP",
      recipient: payload.recipient ?? original.recipient,
      templateId: template.id,
      variables: this.buildVariables(ticket),
      sentById: actor.userId,
    });

    return { communicationId: result.notificationId, status: "SUCCESS", message: result.message };
  }

  private assertCanView(ticket: { serviceTlId: string | null; jobCard: { technicianId: string } | null }, actor: WorkflowActor): void {
    if ((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER") || actor.role === "COORDINATOR") return;
    if (actor.role === "SERVICE_TL" && ticket.serviceTlId === actor.userId) return;
    if (actor.role === "TECHNICIAN" && ticket.jobCard?.technicianId === actor.userId) return;
    throw new ForbiddenError("You are not permitted to view this ticket's communication history.");
  }

  private buildVariables(
    ticket: {
      ticketNumber: string;
      customerName: string;
      hub: string | null;
      statusName: string;
      eta: Date | null;
      finalCharges: unknown;
      estimatedCharges: unknown;
      serviceTlName: string | null;
      jobCard: { technicianName: string; totalCharges: unknown } | null;
    },
    customMessage?: string
  ): Record<string, string> {
    const totalCharges = ticket.jobCard?.totalCharges ?? ticket.finalCharges ?? ticket.estimatedCharges;
    return {
      customerName: ticket.customerName,
      ticketNumber: ticket.ticketNumber,
      hub: ticket.hub ?? "your local hub",
      status: ticket.statusName,
      eta: ticket.eta ? new Date(ticket.eta).toLocaleString("en-IN") : "to be confirmed",
      totalCharges: totalCharges != null ? String(totalCharges) : "0",
      technicianName: ticket.jobCard?.technicianName ?? "",
      serviceTlName: ticket.serviceTlName ?? "",
      customMessage: customMessage ?? "",
    };
  }

  private static toHistoryItem(row: CommunicationLogRow): TicketCommunicationHistoryItemDto {
    return {
      communicationId: row.id,
      eventType: row.eventType as CommunicationCenterEventType,
      templateName: row.templateName,
      message: row.message,
      recipient: row.recipient,
      status: row.status,
      sentByName: row.sentByName,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      errorMessage: row.errorMessage,
    };
  }
}
