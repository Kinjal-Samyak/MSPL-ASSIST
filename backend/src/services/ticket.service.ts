import type { TicketSource, Priority, NotificationStatus } from "@prisma/client";
import { prismaClient } from "../database";
import { MasterRepository } from "../repositories/master.repository";
import { TicketRepository, TicketCreationPayload } from "../repositories/ticket.repository";
import { TicketNumberService } from "./ticket-number.service";
import {
  validateAssignTechnicianDto,
  validateCreateTicketAttachmentDto,
  validateCreateTicketCommentDto,
  validateCreateTicketDto,
  validateTicketIdParam,
  validateTicketListQuery,
  validateUpdateTicketChargesDto,
  validateUpdateTicketEtaDto,
  validateUpdateTicketStatusDto,
} from "../validators";
import { ConflictError, NotFoundError, ApplicationError } from "../errors";
import type {
  AssignTechnicianDto,
  CreateTicketAttachmentDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  TicketAttachmentResponseDto,
  TicketAssignmentResponseDto,
  TicketChargesResponseDto,
  TicketCommentResponseDto,
  TicketDetailResponseDto,
  TicketEtaResponseDto,
  TicketCreationResponseDto,
  TicketListResponseDto,
  TicketNotificationResponseDto,
  TicketStatusResponseDto,
  UpdateTicketChargesDto,
  UpdateTicketEtaDto,
  UpdateTicketStatusDto,
  ValidatedCreateTicketDto,
} from "../dto/ticket.dto";
import { logger } from "../utils/logger";
import { TicketReadMapper } from "./ticket-read.mapper";
import { TicketCommunicationMapper } from "./ticket-communication.mapper";
import { TicketOperationsMapper } from "./ticket-operations.mapper";
import { servicePolicyService, ServicePolicyService } from "./service-policy.service";

/**
 * Cancelled is intentionally never a reachable target here - it can only be reached through
 * the Coordinator's Request Cancellation -> Service Engineer approval workflow (see
 * ticket-closure-request.service.ts), never via a direct free-text status update.
 */
const allowedStatusTransitions: Record<string, string[]> = {
  Open: ["Assigned"],
  Assigned: ["Inspection", "In Progress"],
  Inspection: ["In Progress", "Waiting For Parts"],
  "In Progress": ["Waiting For Parts", "Ready"],
  "Waiting For Parts": ["In Progress", "Ready"],
  Ready: ["Delivered"],
  Delivered: ["Closed"],
  Closed: [],
  Cancelled: [],
};

export class TicketService {
  private readonly masterRepository: MasterRepository;
  private readonly ticketRepository: TicketRepository;
  private readonly ticketNumberService: TicketNumberService;
  private readonly servicePolicyService: ServicePolicyService;

  constructor(
    private readonly prisma = prismaClient,
    masterRepository?: MasterRepository,
    ticketRepository?: TicketRepository,
    ticketNumberService?: TicketNumberService,
    servicePolicyServiceOverride?: ServicePolicyService
  ) {
    this.masterRepository = masterRepository ?? new MasterRepository(this.prisma);
    this.ticketRepository = ticketRepository ?? new TicketRepository(this.prisma);
    this.ticketNumberService = ticketNumberService ?? new TicketNumberService(this.prisma);
    this.servicePolicyService = servicePolicyServiceOverride ?? servicePolicyService;
  }

  async createTicket(input: CreateTicketDto): Promise<TicketCreationResponseDto> {
    const payload = validateCreateTicketDto(input) as ValidatedCreateTicketDto;

    logger.info({
      service: "TicketService",
      action: "createTicket",
      event: "start",
      registeredMobile: payload.registeredMobile,
      issueCategoryId: payload.issueCategoryId,
    });

    const customer = await this.masterRepository.findCustomerByRegisteredMobile(payload.registeredMobile);
    if (!customer) {
      throw new NotFoundError("Rider with the provided phone number was not found.");
    }

    const activeTicket = await this.ticketRepository.findActiveTicketForCustomer(customer.id);
    if (activeTicket) {
      const currentStatus = activeTicket.status.name;

      logger.info({
        service: "TicketService",
        action: "createTicket",
        event: "activeTicketFound",
        customerId: customer.id,
        ticketNumber: activeTicket.ticketNumber,
        currentStatus,
      });

      return {
        existingTicket: true,
        ticketNumber: activeTicket.ticketNumber,
        currentStatus,
      };
    }

    const issueCategory = await this.masterRepository.findIssueCategoryById(payload.issueCategoryId);
    if (!issueCategory) {
      throw new NotFoundError("Ticket issue category was not found.");
    }

    const status = await this.masterRepository.findStatusByName("Open");
    if (!status) {
      throw new NotFoundError("The Open status master record was not found.");
    }

    const deployment = await this.masterRepository.findDeploymentForCustomer(
      customer.id,
      payload.mvTrackNumber,
      payload.vehicleNumber
    );

    const deploymentVerified = Boolean(deployment);

    try {
      const ticket = await this.prisma.$transaction(async (tx) => {
        const ticketNumberPayload = await this.ticketNumberService.generateNextTicketNumber(tx);
        const ticketNumber = ticketNumberPayload.ticketNumber;

        const ticketPayload: TicketCreationPayload = {
          ticketNumber,
          customerId: customer.id,
          deploymentId: deployment?.id,
          issueCategoryId: issueCategory.id,
          statusId: status.id,
          source: payload.source,
          priority: payload.priority,
          issueDescription: payload.issueDescription,
          estimatedCharges: payload.estimatedCharges,
          finalCharges: payload.finalCharges,
          coordinatorNotes: payload.coordinatorNotes,
          sendUpdate: payload.sendUpdate,
          notificationStatus: "NOT_SENT" as NotificationStatus,
          deploymentVerified,
          rowVersion: 1,
          eta: payload.eta ? new Date(payload.eta) : undefined,
        };

        return this.ticketRepository.createTicketWithHistoryAndActivity(ticketPayload, tx);
      });

      logger.info({
        service: "TicketService",
        action: "createTicket",
        event: "success",
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: customer.id,
      });

      return {
        existingTicket: false,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        createdAt: ticket.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error({
        service: "TicketService",
        action: "createTicket",
        event: "failure",
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError("Failed to create ticket.");
    }
  }

  /** Additive Conversation Engine contract; legacy createTicket remains unchanged. */
  async createConversationTicket(input: import("../dto/ticket.dto").CreateConversationTicketDto): Promise<TicketCreationResponseDto> {
    if (!input.issueGroups?.length) throw new ApplicationError("At least one issue group is required.", 400);
    if (!["MOVABLE", "NOT_MOVABLE"].includes(input.rideabilityStatus)) throw new ApplicationError("Rideability status is required.", 400);
    if ((input.remarks?.trim().split(/\s+/).filter(Boolean).length ?? 0) > 200) throw new ApplicationError("Remarks cannot exceed 200 words.", 400);
    const first = input.issueGroups[0];
    const created = await this.createTicket({ registeredMobile: input.registeredMobile, mvTrackNumber: input.mvTrackNumber, vehicleNumber: input.vehicleNumber, issueCategoryId: first.issueCategoryId, issueDescription: first.description || first.issueSubcategory, coordinatorNotes: input.remarks, source: "ADMIN" });
    if (created.existingTicket || !created.ticketId) return created;
    const ticketId = created.ticketId;
    await this.prisma.$transaction(async (tx) => {
      const db = tx as any;
      await db.ticket.update({ where: { id: ticketId }, data: { rideabilityStatus: input.rideabilityStatus, conversationMetadata: input.conversationMetadata ?? {} } });
      for (const [index, group] of input.issueGroups.slice(1).entries()) await tx.ticketIssueItem.create({ data: { ticketId, issueCategoryId: group.issueCategoryId, issueDescription: group.description || group.issueSubcategory, issueSubcategory: group.issueSubcategory, issueStatus: "Open", sequenceNumber: index + 2 } as any });
      for (const photo of input.photoReferences ?? []) await tx.ticketAttachment.create({ data: { ticketId, fileUrl: photo.fileUrl, fileType: photo.fileType } });
      await tx.ticketActivity.create({ data: { ticketId, activityType: "CONVERSATION_TICKET_CREATED", description: "Ticket created through the conversation request contract.", performedAt: new Date(), metadata: { rideabilityStatus: input.rideabilityStatus, issueGroupCount: input.issueGroups.length, photoCount: input.photoReferences?.length ?? 0 } } });
    });
    return created;
  }

  async getTickets(input: unknown): Promise<TicketListResponseDto> {
    const query = validateTicketListQuery(input);
    const [{ items, totalRecords }, policySnapshot] = await Promise.all([
      this.ticketRepository.findTickets(query),
      this.servicePolicyService.getActivePolicySnapshot(),
    ]);

    return TicketReadMapper.toTicketListResponse(items, totalRecords, query.page, query.pageSize, policySnapshot);
  }

  async getTicketById(ticketIdInput: unknown): Promise<TicketDetailResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    await this.ticketRepository.stampOpenedAtIfNeeded(ticketId);
    const [ticket, policySnapshot] = await Promise.all([
      this.ticketRepository.findTicketDetailById(ticketId),
      this.servicePolicyService.getActivePolicySnapshot(),
    ]);

    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }

    return TicketReadMapper.toTicketDetailResponse(ticket, policySnapshot);
  }

  async addComment(ticketIdInput: unknown, input: unknown): Promise<TicketCommentResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateCreateTicketCommentDto(input) as CreateTicketCommentDto;
    await this.ensureTicketExists(ticketId);

    const created = await this.ticketRepository.createComment(ticketId, payload);
    return TicketCommunicationMapper.toCommentResponse(created);
  }

  async getComments(ticketIdInput: unknown): Promise<TicketCommentResponseDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    await this.ensureTicketExists(ticketId);

    const comments = await this.ticketRepository.findComments(ticketId);
    return TicketCommunicationMapper.toCommentListResponse(comments);
  }

  async addAttachment(ticketIdInput: unknown, input: unknown): Promise<TicketAttachmentResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateCreateTicketAttachmentDto(input) as CreateTicketAttachmentDto;
    await this.ensureTicketExists(ticketId);

    const created = await this.ticketRepository.createAttachment(ticketId, payload);
    return TicketCommunicationMapper.toAttachmentResponse(created);
  }

  async getAttachments(ticketIdInput: unknown): Promise<TicketAttachmentResponseDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    await this.ensureTicketExists(ticketId);

    const attachments = await this.ticketRepository.findAttachments(ticketId);
    return TicketCommunicationMapper.toAttachmentListResponse(attachments);
  }

  async getNotifications(ticketIdInput: unknown): Promise<TicketNotificationResponseDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    await this.ensureTicketExists(ticketId);

    const notifications = await this.ticketRepository.findNotifications(ticketId);
    return TicketCommunicationMapper.toNotificationListResponse(notifications);
  }

  async assignTechnician(ticketIdInput: unknown, input: unknown): Promise<TicketAssignmentResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateAssignTechnicianDto(input) as AssignTechnicianDto;
    await this.ensureTicketExists(ticketId);

    const technician = await this.ticketRepository.findTechnicianById(payload.technicianId);
    if (!technician) {
      throw new NotFoundError(`Technician with id ${payload.technicianId} was not found.`);
    }

    const assigned = await this.ticketRepository.assignTechnician(ticketId, payload, technician);
    return TicketOperationsMapper.toAssignmentResponse(assigned, technician);
  }

  async updateStatus(ticketIdInput: unknown, input: unknown): Promise<TicketStatusResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateUpdateTicketStatusDto(input) as UpdateTicketStatusDto;
    const ticket = await this.ticketRepository.findTicketOperationContext(ticketId);

    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }

    const allowedNextStates = allowedStatusTransitions[ticket.status.name] ?? [];
    if (!allowedNextStates.includes(payload.status)) {
      throw new ConflictError(
        `Invalid status transition from ${ticket.status.name} to ${payload.status}.`
      );
    }

    const targetStatus = await this.masterRepository.findStatusByName(payload.status);
    if (!targetStatus) {
      throw new NotFoundError(`Status ${payload.status} was not found.`);
    }

    const updated = await this.ticketRepository.updateTicketStatus(
      ticketId,
      ticket.status.id,
      targetStatus.id,
      ticket.status.name,
      targetStatus.name,
      payload.remarks
    );

    return TicketOperationsMapper.toStatusResponse(updated, ticket.status.name, payload.remarks);
  }

  async updateEta(ticketIdInput: unknown, input: unknown): Promise<TicketEtaResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateUpdateTicketEtaDto(input) as UpdateTicketEtaDto;
    const ticket = await this.ticketRepository.findTicketOperationContext(ticketId);

    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }

    const updated = await this.ticketRepository.updateTicketEta(ticketId, payload);
    return TicketOperationsMapper.toEtaResponse(updated, ticket.eta, payload.reason);
  }

  async updateCharges(ticketIdInput: unknown, input: unknown): Promise<TicketChargesResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateUpdateTicketChargesDto(input) as UpdateTicketChargesDto;
    await this.ensureTicketExists(ticketId);

    const updated = await this.ticketRepository.updateTicketCharges(ticketId, payload);
    return TicketOperationsMapper.toChargesResponse(updated, payload);
  }

  private async ensureTicketExists(ticketId: string): Promise<void> {
    const ticket = await this.ticketRepository.findTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }
  }
}
