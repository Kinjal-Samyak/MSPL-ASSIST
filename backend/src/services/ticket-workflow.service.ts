import type { JobCardStage, Prisma, Role, SparePartRequestStatus, TicketWorkflowStage } from "@prisma/client";
import { prismaClient } from "../database";
import {
  TicketWorkflowRepository,
  type JobCardWorkflowRecord,
  type TicketWorkflowContext,
  type TicketWorkflowRecord,
} from "../repositories/ticket-workflow.repository";
import { validateTicketIdParam, validateTicketListQuery } from "../validators/ticket.validator";
import { computeJobCardEffectiveStatus, JOB_CARD_STATUS_LABELS } from "../utils/job-card-status";
import {
  validateApproveAllSparePartRequestsDto,
  validateAssignServiceTlDto,
  validateCreateSparePartRequestsDto,
  validateCreateSparePartReturnRequestDto,
  validateDecideSparePartRequestDto,
  validateDecideSparePartReturnRequestDto,
  validateJobCardPdfHistoryIdParam,
  validateJobCardTransitionDto,
  validateRecordConsumedQuantityDto,
  validateRequireWorkshopDto,
  validateResolveConsultationDto,
  validateReturnSparePartsToInventoryDto,
  validateSaveJobCardDetailsDto,
  validateSparePartRequestIdParam,
  validateTicketClosePaymentDto,
  validateTicketCloseDecisionDto,
  validateTransferServiceTlDto,
} from "../validators/ticket-workflow.validator";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import type {
  ApproveAllSparePartRequestsResponseDto,
  FinalBillingSnapshotDto,
  JobCardDetailDto,
  JobCardListItemDto,
  JobCardPdfHistoryItemDto,
  JobCardWorkflowTransitionResponseDto,
  PartsTimelineEventDto,
  RecordConsumedQuantityDto,
  ReturnSparePartsToInventoryResponseDto,
  ServiceEngineerDashboardDto,
  SparePartRequestDto,
  SparePartRequestListResponseDto,
  SparePartReturnRequestDto,
  TicketCloseDecisionResponseDto,
  TicketWorkflowTransitionResponseDto,
} from "../dto/ticket-workflow.dto";
import type {
  JobCardDetailRow,
  JobCardListItem,
  JobCardWorkflowContext,
  SparePartRequestRow,
  SparePartReturnRequestRow,
} from "../repositories/ticket-workflow.repository";
import { TicketRepository } from "../repositories/ticket.repository";
import { TicketReadMapper } from "./ticket-read.mapper";
import { servicePolicyService, ServicePolicyService } from "./service-policy.service";
import type { TicketDetailResponseDto, TicketListResponseDto } from "../dto/ticket.dto";

export interface WorkflowActor {
  userId: string;
  role: Role;
}

type JobCardAction = "waitingForParts" | "resume" | "markCompleted" | "readyForDeployment" | "returnForRework";

interface JobCardTransitionRule {
  from: JobCardStage;
  to: JobCardStage;
  activityType: string;
}

/**
 * MSPL Assist owns the ticket lifecycle only up to RFD (Ready For Deployment)
 * on the Job Card. There are intentionally no stages beyond RFD - deployment
 * and fleet operations are owned by MSPL Core.
 *
 * Completion is a two-step handoff: the Technician marks their own repair work
 * COMPLETED, then the Service Engineer performs Final Verification (mandatory completion
 * date/time + technician name) before the job card can reach RFD. Neither role can
 * skip the other's step.
 */
const JOB_CARD_TRANSITIONS: Record<JobCardAction, JobCardTransitionRule> = {
  waitingForParts: { from: "IN_PROGRESS", to: "WAITING_PARTS", activityType: "WORKFLOW_WAITING_FOR_PARTS" },
  resume: { from: "WAITING_PARTS", to: "IN_PROGRESS", activityType: "WORKFLOW_REPAIR_RESUMED" },
  markCompleted: { from: "IN_PROGRESS", to: "COMPLETED", activityType: "WORKFLOW_JOB_CARD_MARKED_COMPLETED" },
  readyForDeployment: { from: "COMPLETED", to: "RFD", activityType: "WORKFLOW_READY_FOR_DEPLOYMENT" },
  returnForRework: { from: "COMPLETED", to: "IN_PROGRESS", activityType: "WORKFLOW_RETURNED_FOR_REWORK" },
};

export class TicketWorkflowService {
  private readonly repository: TicketWorkflowRepository;
  private readonly ticketRepository: TicketRepository;
  private readonly servicePolicyService: Pick<ServicePolicyService, "getActivePolicySnapshot">;

  constructor(
    private readonly prisma = prismaClient,
    repository?: TicketWorkflowRepository,
    ticketRepository?: TicketRepository,
    servicePolicyServiceOverride?: Pick<ServicePolicyService, "getActivePolicySnapshot">
  ) {
    this.repository = repository ?? new TicketWorkflowRepository(this.prisma);
    this.ticketRepository = ticketRepository ?? new TicketRepository(this.prisma);
    this.servicePolicyService = servicePolicyServiceOverride ?? servicePolicyService;
  }

  private getPolicySnapshot() {
    return this.servicePolicyService.getActivePolicySnapshot();
  }

  /**
   * Service Engineer workspace: each Service Engineer sees only tickets currently assigned to them; ADMIN sees all.
   * Ownership moves to the Coordinator once a Job Card reaches RFD (there is nothing left for the Service
   * TL to do - the job card is read-only past that point), so RFD tickets are excluded here entirely.
   */
  async listMyTickets(actor: WorkflowActor, queryInput: unknown): Promise<TicketListResponseDto> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "SERVICE_TL") {
      throw new ForbiddenError("Only a Service Engineer may view this workspace.");
    }

    const query = validateTicketListQuery(queryInput);
    const scopedQuery = {
      ...query,
      ...((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER") ? {} : { serviceTlId: actor.userId }),
      excludeWorkflowStages: ["RFD", "CONSULTATION_RESOLVED"] satisfies TicketWorkflowStage[],
    };
    const [{ items, totalRecords }, policySnapshot] = await Promise.all([
      this.ticketRepository.findTickets(scopedQuery),
      this.getPolicySnapshot(),
    ]);

    return TicketReadMapper.toTicketListResponse(items, totalRecords, query.page, query.pageSize, policySnapshot);
  }

  async getMyTicket(ticketIdInput: unknown, actor: WorkflowActor): Promise<TicketDetailResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const [record, policySnapshot] = await Promise.all([
      this.ticketRepository.findTicketDetailById(ticketId),
      this.getPolicySnapshot(),
    ]);
    if (!record) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      if (actor.role !== "SERVICE_TL" || record.serviceTl?.id !== actor.userId) {
        throw new ForbiddenError("You can only view tickets assigned to you as Service Engineer.");
      }
    }

    return TicketReadMapper.toTicketDetailResponse(record, policySnapshot);
  }

  /** Document 9, Phase 9.1 - Service Engineer Dashboard. Same scoping as listMyTickets: Admin/
   * Service Manager see the whole workshop, a Service Engineer sees only their own tickets. Every
   * figure is derived from existing tables - nothing new is persisted here. */
  async serviceEngineerDashboard(actor: WorkflowActor): Promise<ServiceEngineerDashboardDto> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "SERVICE_TL") {
      throw new ForbiddenError("Only a Service Engineer may view this dashboard.");
    }

    const serviceTlId = actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER" ? null : actor.userId;
    const tickets = await this.repository.findServiceEngineerDashboardTickets(serviceTlId);
    const jobCardIds = tickets.map((ticket) => ticket.jobCard?.id).filter((id): id is string => Boolean(id));
    const now = new Date();

    const [pendingPartsRequests, pendingReturnRequests, recentActivity, technicianFlags, inventoryAlerts] = await Promise.all([
      this.repository.countPendingSparePartRequests(jobCardIds),
      this.repository.countPendingSparePartReturnRequests(jobCardIds),
      this.repository.findRecentActivityForTickets(tickets.map((ticket) => ticket.id), 15),
      this.repository.findTechnicianWorkloadFlags(),
      this.repository.countLowStockParts(),
    ]);

    const openTickets = tickets.filter((ticket) => ticket.workflowStage !== "RFD");
    const busyTechnicians = technicianFlags.filter((technician) => technician.busy).length;

    return {
      jobsByStatus: {
        created: tickets.filter((ticket) => ticket.workflowStage === "CREATED").length,
        review: tickets.filter((ticket) => ticket.workflowStage === "SERVICE_TL_REVIEW").length,
        workshopRequired: tickets.filter((ticket) => ticket.workflowStage === "WORKSHOP_REQUIRED").length,
        rfd: tickets.filter((ticket) => ticket.workflowStage === "RFD").length,
      },
      jobsAwaitingAssignment: openTickets.filter((ticket) => !ticket.assignedToId).length,
      jobsAwaitingPartsApproval: pendingPartsRequests,
      jobsAwaitingGoodsIssue: pendingPartsRequests,
      jobsAwaitingReturnsVerification: pendingReturnRequests,
      jobsReadyForReview: tickets.filter((ticket) => ticket.jobCard?.workflowStage === "COMPLETED").length,
      jobsReadyForDelivery: tickets.filter((ticket) => ticket.jobCard?.workflowStage === "RFD").length,
      overdueJobs: openTickets.filter((ticket) => ticket.eta && ticket.eta < now && !ticket.closedAt).length,
      technicianAvailability: {
        available: technicianFlags.length - busyTechnicians,
        busy: busyTechnicians,
        total: technicianFlags.length,
      },
      workshopUtilizationPercent: technicianFlags.length ? Math.round((busyTechnicians / technicianFlags.length) * 100) : 0,
      inventoryAlerts,
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        ticketId: activity.ticketId,
        ticketNumber: activity.ticketNumber,
        activityType: activity.activityType,
        description: activity.description,
        performedByName: activity.performedBy?.name ?? null,
        performedAt: activity.performedAt.toISOString(),
      })),
    };
  }

  async assignServiceTl(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketWorkflowTransitionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateAssignServiceTlDto(input);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "COORDINATOR") {
      throw new ForbiddenError("Only a Coordinator can assign a Service Engineer.");
    }

    const ticket = await this.repository.findWorkflowContext(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }
    this.assertStageIn(ticket, ["CREATED", "REOPENED"]);

    const serviceTl = await this.repository.findServiceTlById(payload.serviceTlId);
    if (!serviceTl) {
      throw new NotFoundError(`Service Engineer with id ${payload.serviceTlId} was not found.`);
    }

    const updated = await this.repository.applyTicketTransition({
      ticketId,
      data: {
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: serviceTl.id,
        assignedAt: new Date(),
      },
      activity: {
        activityType: "WORKFLOW_SERVICE_TL_ASSIGNED",
        description: `Service Engineer ${serviceTl.name} assigned for review.`,
        performedById: actor.userId,
        metadata: {
          previousStage: ticket.workflowStage,
          newStage: "SERVICE_TL_REVIEW",
          remarks: payload.remarks ?? null,
          serviceTlId: serviceTl.id,
          serviceTlName: serviceTl.name,
        },
      },
    });

    return this.toTicketResponse(ticket.workflowStage, updated);
  }

  async transferServiceTl(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketWorkflowTransitionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateTransferServiceTlDto(input);

    const ticket = await this.requireReviewStageTicket(ticketId, actor);

    const serviceTl = await this.repository.findServiceTlById(payload.serviceTlId);
    if (!serviceTl) {
      throw new NotFoundError(`Service Engineer with id ${payload.serviceTlId} was not found.`);
    }

    const updated = await this.repository.applyTicketTransition({
      ticketId,
      data: {
        serviceTlId: serviceTl.id,
      },
      activity: {
        activityType: "WORKFLOW_SERVICE_TL_TRANSFERRED",
        description: `Ticket transferred to Service Engineer ${serviceTl.name}.`,
        performedById: actor.userId,
        metadata: {
          previousStage: "SERVICE_TL_REVIEW",
          newStage: "SERVICE_TL_REVIEW",
          remarks: payload.remarks ?? null,
          previousServiceTlId: ticket.serviceTlId,
          newServiceTlId: serviceTl.id,
        },
      },
    });

    return this.toTicketResponse("SERVICE_TL_REVIEW", updated);
  }

  async resolveConsultation(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketWorkflowTransitionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateResolveConsultationDto(input);

    await this.requireReviewStageTicket(ticketId, actor);

    const closedStatusId = await this.repository.findClosedStatusId();
    if (!closedStatusId) {
      throw new ConflictError("No active 'Closed' status is configured in Status Master.");
    }

    const updated = await this.repository.applyTicketTransition({
      ticketId,
      data: {
        workflowStage: "CONSULTATION_RESOLVED",
        statusId: closedStatusId,
        closedAt: new Date(),
      },
      activity: {
        activityType: "WORKFLOW_CONSULTATION_RESOLVED",
        description: "Consultation resolved; ticket closed with no job card.",
        performedById: actor.userId,
        metadata: {
          previousStage: "SERVICE_TL_REVIEW",
          newStage: "CONSULTATION_RESOLVED",
          remarks: payload.remarks ?? null,
        },
      },
    });

    return this.toTicketResponse("SERVICE_TL_REVIEW", updated);
  }

  async requireWorkshop(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateRequireWorkshopDto(input);

    const ticket = await this.requireReviewStageTicket(ticketId, actor);

    const technician = await this.repository.findTechnicianById(payload.technicianId);
    if (!technician) {
      throw new NotFoundError(`Technician with id ${payload.technicianId} was not found.`);
    }

    /** Once a technician is assigned, a Reopened ticket's status returns to the normal in-progress "Open" state. */
    const resetStatusId =
      ticket.status?.name.toLowerCase() === "reopened" ? ((await this.repository.findOpenStatusId()) ?? undefined) : undefined;

    const jobCard = await this.repository.createJobCard({
      ticketId,
      technicianId: technician.id,
      resetStatusId,
      activity: {
        activityType: "WORKFLOW_WORKSHOP_REQUIRED",
        description: `Workshop required; job card created and assigned to ${technician.name}.`,
        performedById: actor.userId,
        metadata: {
          previousStage: "SERVICE_TL_REVIEW",
          newStage: "WORKSHOP_REQUIRED",
          remarks: payload.remarks ?? null,
          technicianId: technician.id,
          technicianName: technician.name,
        },
      },
    });

    return this.toJobCardResponse("IN_PROGRESS", jobCard);
  }

  async waitingForParts(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    return this.runJobCardTransition("waitingForParts", ticketIdInput, actor, input);
  }

  async resume(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    return this.runJobCardTransition("resume", ticketIdInput, actor, input);
  }

  /** Technician's own record that repair work is done - hands the job card back to the Service Engineer. */
  async markJobCardCompleted(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    return this.runJobCardTransition("markCompleted", ticketIdInput, actor, input);
  }

  /** Service Engineer Final Verification - the only path from COMPLETED to RFD. */
  async readyForDeployment(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    return this.runJobCardTransition("readyForDeployment", ticketIdInput, actor, input);
  }

  /**
   * Service Engineer fast-path from Final Verification: run the same Ready for Deployment
   * transition (job card -> RFD, mandatory completion date/time/name), then immediately
   * close the ticket too - skipping the Coordinator's Ready to Close queue entirely for
   * repairs that don't need a separate delivery step (e.g. immediate walk-in pickup).
   */
  async closeTicketAfterVerification(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    const payment = validateTicketClosePaymentDto(input);
    const result = await this.runJobCardTransition("readyForDeployment", ticketIdInput, actor, input);

    const ticketId = validateTicketIdParam(ticketIdInput);
    const closedStatusId = await this.repository.findClosedStatusId();
    if (!closedStatusId) {
      throw new ConflictError("No active 'Closed' status is configured in Status Master.");
    }
    await this.repository.closeTicketDirectly(ticketId, closedStatusId, payment, actor.userId);

    return result;
  }

  /** Service Engineer Final Verification finds an issue - sends the job card back to the Technician with mandatory rework remarks. */
  async returnJobCardForRework(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    return this.runJobCardTransition("returnForRework", ticketIdInput, actor, input);
  }

  /**
   * Administrator unlock: the only way a Job Card can move out of RFD. Reopens it to
   * IN_PROGRESS so the normal Workshop Workspace transitions become available again.
   * Everyone else remains permanently locked out once RFD is reached.
   */
  async unlockJobCard(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateJobCardTransitionDto(input);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      throw new ForbiddenError("Only an Administrator can unlock a Job Card.");
    }

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    if (jobCard.workflowStage !== "RFD") {
      throw new ConflictError(`Invalid unlock: job card is in ${jobCard.workflowStage}, but unlock requires RFD.`);
    }

    const updated = await this.repository.applyJobCardTransition({
      ticketId,
      jobCardId: jobCard.id,
      data: {
        workflowStage: "IN_PROGRESS",
      },
      activity: {
        activityType: "WORKFLOW_JOB_CARD_UNLOCKED",
        description: "Job card unlocked by Administrator and reopened to In Progress.",
        performedById: actor.userId,
        metadata: {
          previousStage: "RFD",
          newStage: "IN_PROGRESS",
          remarks: payload.remarks ?? null,
        },
      },
    });

    return this.toJobCardResponse("RFD", updated);
  }

  async listJobCards(actor: WorkflowActor): Promise<JobCardListItemDto[]> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "TECHNICIAN") {
      throw new ForbiddenError("Only a Technician may view job cards.");
    }

    const scope = (actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER") ? undefined : actor.userId;
    const jobCards = await this.repository.findJobCards(scope);
    return jobCards.map(TicketWorkflowService.toJobCardListItemDto);
  }

  async getJobCard(jobCardIdInput: unknown, actor: WorkflowActor): Promise<JobCardListItemDto> {
    const jobCardId = validateTicketIdParam(jobCardIdInput);
    const jobCard = await this.repository.findJobCardById(jobCardId);
    if (!jobCard) {
      throw new NotFoundError(`Job card with id ${jobCardId} was not found.`);
    }

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && (actor.role !== "TECHNICIAN" || jobCard.technicianId !== actor.userId)) {
      throw new ForbiddenError("You can only view job cards assigned to you.");
    }

    return TicketWorkflowService.toJobCardListItemDto(jobCard);
  }

  private static toJobCardListItemDto(jobCard: JobCardListItem): JobCardListItemDto {
    const effectiveStatus = computeJobCardEffectiveStatus(jobCard.workflowStage, jobCard.lastEditedAt);

    return {
      id: jobCard.id,
      ticketId: jobCard.ticketId,
      ticketNumber: jobCard.ticketNumber,
      workflowStage: jobCard.workflowStage,
      effectiveStatus,
      effectiveStatusLabel: JOB_CARD_STATUS_LABELS[effectiveStatus],
      technicianId: jobCard.technicianId,
      customerName: jobCard.customerName,
      issueDescription: jobCard.issueDescription,
      createdAt: jobCard.createdAt.toISOString(),
      updatedAt: jobCard.updatedAt.toISOString(),
    };
  }

  private assertStage(ticket: TicketWorkflowContext, expected: TicketWorkflowStage): void {
    if (ticket.workflowStage !== expected) {
      throw new ConflictError(
        `Invalid transition: ticket ${ticket.ticketNumber} is in ${ticket.workflowStage}, but this action requires ${expected}.`
      );
    }
  }

  private assertStageIn(ticket: TicketWorkflowContext, expected: TicketWorkflowStage[]): void {
    if (!expected.includes(ticket.workflowStage)) {
      throw new ConflictError(
        `Invalid transition: ticket ${ticket.ticketNumber} is in ${ticket.workflowStage}, but this action requires one of ${expected.join(", ")}.`
      );
    }
  }

  private async requireReviewStageTicket(ticketId: string, actor: WorkflowActor): Promise<TicketWorkflowContext> {
    const ticket = await this.repository.findWorkflowContext(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }

    this.assertStage(ticket, "SERVICE_TL_REVIEW");

    /** Coordinator Workspace and Workshop/Technician Workspace are strictly isolated - only Service Engineer (own tickets) or Admin may act here. */
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      if (actor.role !== "SERVICE_TL" || ticket.serviceTlId !== actor.userId) {
        throw new ForbiddenError("You can only manage tickets assigned to you as Service Engineer.");
      }
    }

    return ticket;
  }

  private async runJobCardTransition(
    action: JobCardAction,
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<JobCardWorkflowTransitionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateJobCardTransitionDto(input);

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    const rule = JOB_CARD_TRANSITIONS[action];

    /** Single, canonical RFD lock check - applies identically to detail edits, spare parts and stage transitions. */
    this.assertJobCardEditable(jobCard, actor);

    if (jobCard.workflowStage !== rule.from) {
      throw new ConflictError(
        `Invalid transition: job card is in ${jobCard.workflowStage}, but this action requires ${rule.from}.`
      );
    }

    await this.assertCanPerformJobCardAction(action, ticketId, jobCard, actor);

    if (action === "markCompleted" && !jobCard.repairStartedAt) {
      throw new ValidationError("Start Repair before marking the job card as completed.");
    }

    /** Job Card Closure Validation: every issued spare part must reconcile exactly
     * (requiredQuantity = consumedQuantity + returnedQuantity) before the job can complete - an
     * un-reconciled line means stock left Central Inventory but was neither used nor returned. */
    if (action === "markCompleted") {
      const unreconciled = await this.repository.findUnreconciledSpareParts(jobCard.id);
      if (unreconciled.length > 0) {
        const detail = unreconciled
          .map((row) => `${row.partCode} (issued ${row.requiredQuantity}, consumed ${row.consumedQuantity}, returned ${row.returnedQuantity})`)
          .join("; ");
        throw new ValidationError(
          `Every issued spare part must be fully consumed or returned before completing this job card: ${detail}.`
        );
      }
    }

    if (action === "readyForDeployment" && (!payload.actualCompletionAt || !payload.completedByName)) {
      throw new ValidationError(
        "Completion Date, Completion Time and Technician Name are required for Final Verification before Ready for Deployment."
      );
    }

    if (action === "returnForRework" && !payload.remarks?.trim()) {
      throw new ValidationError("Rework remarks are required when returning a job card to the Technician.");
    }

    /** Mark Complete is auto-captured, not entered by the Technician: the completion timestamp
     * is "now," and the completing Technician's name is looked up server-side from the job
     * card's own assignment rather than typed/selected client-side. Final Verification
     * (readyForDeployment) is unaffected - the Service Engineer still attests date/time/name there. */
    let autoActualCompletionAt: Date | undefined;
    let autoCompletedByName: string | undefined;
    if (action === "markCompleted") {
      autoActualCompletionAt = new Date();
      const technician = await this.repository.findTechnicianById(jobCard.technicianId);
      autoCompletedByName = technician?.name;
    }

    const resolvedActualCompletionAt = autoActualCompletionAt ?? (payload.actualCompletionAt ? new Date(payload.actualCompletionAt) : undefined);
    const resolvedCompletedByName = autoCompletedByName ?? payload.completedByName;

    /** Final Spare Part Billing (Amendment 2): Ready For Delivery is the financial lock point.
     * The snapshot is computed strictly from consumedQuantity x Part.partCost - never requested,
     * approved, issued or returned quantity - frozen onto the job card, and never recalculated
     * afterwards (see assertJobCardEditable, which locks the whole parts section from this
     * moment on). */
    const billingFields = rule.to === "RFD" ? await this.buildFinalBillingSnapshot(jobCard.id, actor) : {};

    const updated = await this.repository.applyJobCardTransition({
      ticketId,
      jobCardId: jobCard.id,
      data: {
        workflowStage: rule.to,
        ...(resolvedActualCompletionAt ? { actualCompletionAt: resolvedActualCompletionAt } : {}),
        ...(resolvedCompletedByName ? { completedByName: resolvedCompletedByName } : {}),
        ...(payload.remarks ? { closureRemarks: payload.remarks } : {}),
        ...(rule.to === "RFD" ? { partsRequisitionClosedAt: new Date() } : {}),
        ...billingFields,
      },
      activity: {
        activityType: rule.activityType,
        description: `Job card stage changed from ${rule.from} to ${rule.to}.`,
        performedById: actor.userId,
        metadata: {
          previousStage: rule.from,
          newStage: rule.to,
          remarks: payload.remarks ?? null,
          completedByName: resolvedCompletedByName ?? null,
          actualCompletionAt: resolvedActualCompletionAt ? resolvedActualCompletionAt.toISOString() : null,
        },
      },
    });

    return this.toJobCardResponse(rule.from, updated);
  }

  /** Final Spare Part Billing (Amendment 2): builds the immutable billing snapshot frozen onto
   * the job card the instant it reaches RFD. Billable Quantity is always Consumed Quantity -
   * Requested/Approved/Issued/Returned quantities never factor into the amount. */
  private async buildFinalBillingSnapshot(
    jobCardId: string,
    actor: WorkflowActor
  ): Promise<Pick<Prisma.JobCardUncheckedUpdateInput, "readyForDeliveryAt" | "readyForDeliveryById" | "finalSparePartsAmount" | "finalBillingSnapshot">> {
    const [spareParts, user] = await Promise.all([
      this.repository.findSparePartsForBilling(jobCardId),
      this.repository.findUserNameById(actor.userId),
    ]);

    const readyForDeliveryAt = new Date();
    const items = spareParts.map((part) => {
      const rate = part.partCost;
      const amount = rate.mul(part.consumedQuantity);
      return {
        partId: part.partId,
        partCode: part.partCode,
        partName: part.partName,
        consumedQuantity: part.consumedQuantity,
        rate: rate.toFixed(2),
        amount: amount.toFixed(2),
      };
    });
    const finalSparePartsTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);

    const snapshot: FinalBillingSnapshotDto = {
      readyForDeliveryAt: readyForDeliveryAt.toISOString(),
      readyForDeliveryById: actor.userId,
      readyForDeliveryByName: user?.name ?? "Unknown",
      items,
      finalSparePartsTotal: finalSparePartsTotal.toFixed(2),
    };

    return {
      readyForDeliveryAt,
      readyForDeliveryById: actor.userId,
      finalSparePartsAmount: finalSparePartsTotal.toFixed(2),
      finalBillingSnapshot: snapshot as unknown as Prisma.InputJsonValue,
    };
  }

  /**
   * Job Card stage updates (Waiting for Parts / RFD) may be recorded by the assigned
   * Technician or the ticket's Service Engineer - both within the shared Workshop Workspace.
   * Coordinator has no Workshop Workspace access; Admin always bypasses.
   */
  private async assertCanUpdateJobCard(
    ticketId: string,
    jobCard: { technicianId: string },
    actor: WorkflowActor
  ): Promise<void> {
    if ((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER")) {
      return;
    }

    if (actor.role === "TECHNICIAN" && jobCard.technicianId === actor.userId) {
      return;
    }

    if (actor.role === "SERVICE_TL") {
      const ticket = await this.repository.findWorkflowContext(ticketId);
      if (ticket?.serviceTlId === actor.userId) {
        return;
      }
    }

    throw new ForbiddenError("You are not permitted to update this job card.");
  }

  /**
   * Completion is a two-step handoff and each step belongs to exactly one role:
   * only the assigned Technician may mark their own work COMPLETED, and only the
   * ticket's Service Engineer may perform Final Verification through to RFD. Waiting for
   * Parts / Resume remain shared, as before.
   */
  private async assertCanPerformJobCardAction(
    action: JobCardAction,
    ticketId: string,
    jobCard: { technicianId: string },
    actor: WorkflowActor
  ): Promise<void> {
    if ((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER")) {
      return;
    }

    if (action === "markCompleted") {
      if (actor.role === "TECHNICIAN" && jobCard.technicianId === actor.userId) {
        return;
      }
      throw new ForbiddenError("Only the assigned Technician can mark this job card as completed.");
    }

    if (action === "readyForDeployment" || action === "returnForRework") {
      if (actor.role === "SERVICE_TL") {
        const ticket = await this.repository.findWorkflowContext(ticketId);
        if (ticket?.serviceTlId === actor.userId) {
          return;
        }
      }
      throw new ForbiddenError(
        action === "returnForRework"
          ? "Only the assigned Service Engineer can return a job card for rework."
          : "Only the assigned Service Engineer can perform final verification and mark Ready for Deployment."
      );
    }

    await this.assertCanUpdateJobCard(ticketId, jobCard, actor);
  }

  async getJobCardDetail(ticketIdInput: unknown, actor: WorkflowActor): Promise<JobCardDetailDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const jobCard = await this.repository.findJobCardDetail(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    await this.assertCanViewJobCard(ticketId, jobCard, actor);

    const partsTimeline = await this.buildPartsTimeline(jobCard.id);
    return { ...TicketWorkflowService.toJobCardDetailDto(jobCard), partsTimeline };
  }

  /**
   * Job Card Parts Timeline (Document 8): Requested -> Approved/Rejected -> Issued -> Consumed ->
   * Returned -> Pending Procurement (if applicable), reusing existing data sources exclusively -
   * no new event-log table. Requested/Approved/Rejected come from JobCardSparePartRequest, Issued/
   * Returned come from the PartInventoryTransaction ledger (the single source of truth for stock
   * movements), Consumed is JobCardSparePart's own consumedQuantity/consumedBy/consumedAt snapshot,
   * and Pending Procurement comes from ProcurementRequest rows raised against this job card.
   */
  private async buildPartsTimeline(jobCardId: string): Promise<PartsTimelineEventDto[]> {
    const [requests, returnRequests, transactions, spareParts, procurementRequests] = await Promise.all([
      this.repository.findSparePartRequests(jobCardId),
      this.repository.findSparePartReturnRequests(jobCardId),
      this.repository.findJobCardIssueAndReturnTransactions(jobCardId),
      this.repository.findConsumedSpareParts(jobCardId),
      this.repository.findProcurementRequestsForJobCard(jobCardId),
    ]);

    const events: PartsTimelineEventDto[] = [];

    for (const request of requests) {
      events.push({
        stage: "REQUESTED",
        partId: request.partId,
        partCode: request.part.partCode,
        partName: request.part.partName,
        quantity: request.requestedQuantity,
        userId: request.requestedById,
        userName: request.requestedBy.name,
        timestamp: request.requestedAt.toISOString(),
        remarks: null,
      });
      if (request.status === "APPROVED" || request.status === "REJECTED") {
        events.push({
          stage: request.status === "APPROVED" ? "APPROVED" : "REJECTED",
          partId: request.partId,
          partCode: request.part.partCode,
          partName: request.part.partName,
          quantity: request.approvedQuantity ?? request.requestedQuantity,
          userId: request.decidedById,
          userName: request.decidedBy?.name ?? null,
          timestamp: (request.decidedAt ?? request.requestedAt).toISOString(),
          remarks: request.decisionRemarks,
        });
      }
    }

    for (const returnRequest of returnRequests) {
      events.push({
        stage: "RETURN_REQUESTED",
        partId: returnRequest.partId,
        partCode: returnRequest.part.partCode,
        partName: returnRequest.part.partName,
        quantity: returnRequest.requestedReturnQuantity,
        userId: returnRequest.requestedById,
        userName: returnRequest.requestedBy.name,
        timestamp: returnRequest.requestedAt.toISOString(),
        remarks: null,
      });
    }

    for (const transaction of transactions) {
      events.push({
        stage: transaction.transactionType === "ISSUE" ? "ISSUED" : "RETURNED",
        partId: transaction.part.id,
        partCode: transaction.part.partCode,
        partName: transaction.part.partName,
        quantity: Math.abs(transaction.quantityDelta),
        userId: transaction.performedById,
        userName: transaction.performedBy.name,
        timestamp: transaction.createdAt.toISOString(),
        remarks: transaction.reason,
      });
    }

    for (const sparePart of spareParts) {
      if (!sparePart.consumedAt) continue;
      events.push({
        stage: "CONSUMED",
        partId: sparePart.part.id,
        partCode: sparePart.part.partCode,
        partName: sparePart.part.partName,
        quantity: sparePart.consumedQuantity,
        userId: sparePart.consumedById,
        userName: sparePart.consumedBy?.name ?? null,
        timestamp: sparePart.consumedAt.toISOString(),
        remarks: null,
      });
    }

    for (const procurementRequest of procurementRequests) {
      if (procurementRequest.status !== "PENDING" && procurementRequest.status !== "APPROVED") continue;
      events.push({
        stage: "PENDING_PROCUREMENT",
        partId: procurementRequest.part.id,
        partCode: procurementRequest.part.partCode,
        partName: procurementRequest.part.partName,
        quantity: procurementRequest.requestedQuantity,
        userId: procurementRequest.requestedById,
        userName: procurementRequest.requestedBy.name,
        timestamp: procurementRequest.createdAt.toISOString(),
        remarks: `Procurement request ${procurementRequest.requestNumber} (${procurementRequest.status})`,
      });
    }

    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Record that a Job Card PDF was generated. Called immediately after a successful
   * render in the controller, reusing the authorization already performed by the
   * preceding getJobCardDetail() call in the same request - no re-check needed here.
   */
  async recordJobCardPdfHistory(
    jobCardId: string,
    version: number,
    fileName: string,
    content: Buffer,
    actor: WorkflowActor
  ): Promise<void> {
    await this.repository.createJobCardPdfHistory({
      jobCardId,
      version,
      fileName,
      content,
      generatedById: actor.userId,
    });
  }

  async listJobCardPdfHistory(ticketIdInput: unknown, actor: WorkflowActor): Promise<JobCardPdfHistoryItemDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const jobCard = await this.repository.findJobCardDetail(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    await this.assertCanViewJobCard(ticketId, jobCard, actor);

    const rows = await this.repository.findJobCardPdfHistory(jobCard.id);
    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      fileName: row.fileName,
      generatedAt: row.generatedAt.toISOString(),
      generatedByName: row.generatedByName,
    }));
  }

  async getJobCardPdfHistoryContent(
    pdfHistoryIdInput: unknown,
    actor: WorkflowActor
  ): Promise<{ fileName: string; content: Buffer }> {
    const pdfHistoryId = validateJobCardPdfHistoryIdParam(pdfHistoryIdInput);
    const record = await this.repository.findJobCardPdfHistoryContent(pdfHistoryId);
    if (!record) {
      throw new NotFoundError(`Job card PDF history entry with id ${pdfHistoryId} was not found.`);
    }

    await this.assertCanViewJobCard(record.ticketId, { technicianId: record.technicianId }, actor);

    return { fileName: record.fileName, content: record.content };
  }

  /**
   * Job Card view: Admin always; the assigned Technician/Service Engineer; and Coordinator (read-only) -
   * Coordinators need this once ownership returns to them at RFD (e.g. to print the delivery note).
   */
  private async assertCanViewJobCard(
    ticketId: string,
    jobCard: { technicianId: string },
    actor: WorkflowActor
  ): Promise<void> {
    if ((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER") || actor.role === "COORDINATOR") {
      return;
    }

    if (actor.role === "TECHNICIAN" && jobCard.technicianId === actor.userId) {
      return;
    }

    if (actor.role === "SERVICE_TL") {
      const ticket = await this.repository.findWorkflowContext(ticketId);
      if (ticket?.serviceTlId === actor.userId) {
        return;
      }
    }

    throw new ForbiddenError("You are not permitted to view this job card.");
  }

  async saveJobCardDetails(ticketIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<JobCardDetailDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateSaveJobCardDetailsDto(input);

    const jobCard = await this.repository.findJobCardDetail(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    this.assertJobCardEditable(jobCard, actor);
    await this.assertCanUpdateJobCard(ticketId, jobCard, actor);

    /**
     * Field-level permission split (approved fields only): the Service Engineer (and Admin)
     * own the diagnostic/planning fields - Initial Observation, Root Cause, Other
     * Requirements, ETA and charges. The assigned Technician may record only their own
     * repair notes - Work Performed and Technician Remarks - and can never touch the
     * Service Engineer's diagnosis, charges, ETA or ticket-level information.
     */
    const effectivePayload =
      actor.role === "TECHNICIAN"
        ? {
            workPerformed: payload.workPerformed,
            technicianRemarks: payload.technicianRemarks,
          }
        : payload;

    /**
     * Charges are always auto-calculated server-side from their three components.
     * Any client-submitted totalCharges is ignored on purpose - the stored total can
     * never drift from labourCharges + partsCharges + otherCharges.
     */
    const labourCharges = effectivePayload.labourCharges ?? TicketWorkflowService.decimalToNumber(jobCard.labourCharges);
    const partsCharges = effectivePayload.partsCharges ?? TicketWorkflowService.decimalToNumber(jobCard.partsCharges);
    const otherCharges = effectivePayload.otherCharges ?? TicketWorkflowService.decimalToNumber(jobCard.otherCharges);
    const hasAnyChargeComponent =
      effectivePayload.labourCharges !== undefined ||
      effectivePayload.partsCharges !== undefined ||
      effectivePayload.otherCharges !== undefined ||
      jobCard.labourCharges !== null ||
      jobCard.partsCharges !== null ||
      jobCard.otherCharges !== null;
    const totalCharges = hasAnyChargeComponent
      ? Number((labourCharges + partsCharges + otherCharges).toFixed(2))
      : undefined;

    const updateData: Prisma.JobCardUncheckedUpdateInput = {
      initialObservation: effectivePayload.initialObservation,
      rootCause: effectivePayload.rootCause,
      workPerformed: effectivePayload.workPerformed,
      otherRequirements: effectivePayload.otherRequirements,
      technicianRemarks: effectivePayload.technicianRemarks,
      labourCharges: effectivePayload.labourCharges,
      partsCharges: effectivePayload.partsCharges,
      otherCharges: effectivePayload.otherCharges,
      totalCharges,
      estimatedCompletionAt: effectivePayload.estimatedCompletionAt
        ? new Date(effectivePayload.estimatedCompletionAt)
        : undefined,
    };

    const changes = TicketWorkflowService.diffFields(
      {
        initialObservation: jobCard.initialObservation,
        rootCause: jobCard.rootCause,
        workPerformed: jobCard.workPerformed,
        otherRequirements: jobCard.otherRequirements,
        technicianRemarks: jobCard.technicianRemarks,
        labourCharges: jobCard.labourCharges,
        partsCharges: jobCard.partsCharges,
        otherCharges: jobCard.otherCharges,
        totalCharges: jobCard.totalCharges,
        estimatedCompletionAt: jobCard.estimatedCompletionAt,
      },
      {
        initialObservation: effectivePayload.initialObservation,
        rootCause: effectivePayload.rootCause,
        workPerformed: effectivePayload.workPerformed,
        otherRequirements: effectivePayload.otherRequirements,
        technicianRemarks: effectivePayload.technicianRemarks,
        labourCharges: effectivePayload.labourCharges,
        partsCharges: effectivePayload.partsCharges,
        otherCharges: effectivePayload.otherCharges,
        totalCharges,
        estimatedCompletionAt: effectivePayload.estimatedCompletionAt,
      }
    );

    const updated = await this.repository.saveJobCardDetails(jobCard.id, ticketId, updateData, {
      activityType: "WORKFLOW_JOB_CARD_SAVED",
      description: "Job card inspection details saved.",
      performedById: actor.userId,
      metadata: { changes } as Prisma.InputJsonValue,
    });

    const partsTimeline = await this.buildPartsTimeline(jobCard.id);
    return { ...TicketWorkflowService.toJobCardDetailDto(updated), partsTimeline };
  }

  private static decimalToNumber(value: Prisma.Decimal | null): number {
    return value ? Number(value) : 0;
  }

  /** Returns only the fields that actually changed, each with its before/after value, for audit metadata. */
  private static diffFields(
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): Record<string, { before: unknown; after: unknown }> {
    const changes: Record<string, { before: unknown; after: unknown }> = {};

    for (const [key, afterValue] of Object.entries(after)) {
      if (afterValue === undefined) {
        continue;
      }

      const rawBefore = before[key];
      const normalizedBefore =
        rawBefore !== null && typeof rawBefore === "object" && "toFixed" in (rawBefore as object)
          ? Number(rawBefore)
          : rawBefore instanceof Date
            ? rawBefore.toISOString()
            : (rawBefore ?? null);

      if (normalizedBefore !== afterValue) {
        changes[key] = { before: normalizedBefore, after: afterValue };
      }
    }

    return changes;
  }

  /** Technician submits one or more spare parts for Service Engineer approval - does not touch the confirmed list or inventory until approved. */
  async requestSpareParts(ticketIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartRequestDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateCreateSparePartRequestsDto(input);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "TECHNICIAN") {
      throw new ForbiddenError("Only the assigned Technician can request spare parts.");
    }

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    this.assertJobCardEditable(jobCard, actor);

    if (actor.role === "TECHNICIAN" && jobCard.technicianId !== actor.userId) {
      throw new ForbiddenError("You can only request spare parts for your own job card.");
    }

    const parts = await this.repository.findPartsByIds(payload.items.map((item) => item.partId));
    const partsById = new Map(parts.map((part) => [part.id, part]));
    for (const item of payload.items) {
      if (!partsById.has(item.partId)) {
        throw new NotFoundError(`Part with id ${item.partId} was not found.`);
      }
    }

    const created = await this.repository.createSparePartRequests(jobCard.id, ticketId, actor.userId, payload.items, {
      activityType: "SPARE_PART_REQUEST_SUBMITTED",
      description: `Technician requested ${payload.items.length} spare part${payload.items.length === 1 ? "" : "s"}.`,
      performedById: actor.userId,
      metadata: {
        items: payload.items.map((item) => ({ partId: item.partId, requestedQuantity: item.requestedQuantity })),
      },
    });

    return created.map(TicketWorkflowService.toSparePartRequestDto);
  }

  /** Full history (pending, approved, rejected, reversed) for a job card's spare part requests. */
  async listSparePartRequests(ticketIdInput: unknown, actor: WorkflowActor): Promise<SparePartRequestDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    await this.assertCanViewJobCard(ticketId, jobCard, actor);

    const rows = await this.repository.findSparePartRequests(jobCard.id);
    return rows.map(TicketWorkflowService.toSparePartRequestDto);
  }

  /** Cross-job-card rollup for Inventory's "Part Requisitions" page. Any Service Engineer/Admin can view
   * every job card's requests here - unlike listSparePartRequests, there is no single ticket to
   * check "assigned to this actor" against. */
  async listAllSparePartRequests(queryInput: unknown): Promise<SparePartRequestListResponseDto> {
    const query = queryInput as Record<string, unknown> | undefined;
    const page = Number(query?.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 25));
    const status = typeof query?.status === "string" && query.status ? (query.status as SparePartRequestStatus) : undefined;
    const partCode = typeof query?.partCode === "string" && query.partCode.trim() !== "" ? query.partCode.trim() : undefined;

    const { items, totalRecords } = await this.repository.listAllSparePartRequests({
      page: page > 0 ? page : 1,
      pageSize,
      status,
      partCode,
    });
    return {
      items: items.map(TicketWorkflowService.toSparePartRequestDto),
      totalRecords,
      page: page > 0 ? page : 1,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  /** Service Engineer/Admin approves a PENDING request - deducts inventory and adds it to the confirmed spare parts list. */
  async approveSparePartRequest(requestIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartRequestDto> {
    return this.decideSparePartRequest(requestIdInput, actor, input, "APPROVED");
  }

  /** Service Engineer/Admin rejects a PENDING request - a reason is required and the request stays visible with it. */
  async rejectSparePartRequest(requestIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartRequestDto> {
    return this.decideSparePartRequest(requestIdInput, actor, input, "REJECTED");
  }

  private async decideSparePartRequest(
    requestIdInput: unknown,
    actor: WorkflowActor,
    input: unknown,
    decision: "APPROVED" | "REJECTED"
  ): Promise<SparePartRequestDto> {
    const requestId = validateSparePartRequestIdParam(requestIdInput);
    const payload = validateDecideSparePartRequestDto(input);

    if (decision === "REJECTED" && !payload.remarks) {
      throw new ValidationError("A reason is required to reject a spare part request.");
    }

    const existing = await this.repository.findSparePartRequestById(requestId);
    if (!existing) {
      throw new NotFoundError(`Spare part request with id ${requestId} was not found.`);
    }
    if (existing.status !== "PENDING") {
      throw new ConflictError(`This request has already been ${existing.status.toLowerCase()}.`);
    }
    this.assertJobCardEditable(existing.jobCard, actor);

    await this.assertCanDecideSparePartRequest(existing, actor);

    const approvedQuantity = decision === "APPROVED" ? payload.approvedQuantity ?? existing.requestedQuantity : undefined;
    const wasEdited = decision === "APPROVED" && approvedQuantity !== existing.requestedQuantity;

    const result = await this.repository.decideSparePartRequest({
      requestId,
      decision,
      decidedById: actor.userId,
      remarks: payload.remarks,
      approvedQuantity,
      ticketId: existing.jobCard.ticketId,
      activity: {
        activityType: decision === "APPROVED" ? "SPARE_PART_REQUEST_APPROVED" : "SPARE_PART_REQUEST_REJECTED",
        description:
          decision === "APPROVED"
            ? wasEdited
              ? `Spare part request approved: ${approvedQuantity} x ${existing.part.partCode} (requested ${existing.requestedQuantity}, edited by approver).`
              : `Spare part request approved: ${existing.requestedQuantity} x ${existing.part.partCode}.`
            : `Spare part request rejected: ${existing.requestedQuantity} x ${existing.part.partCode}. Reason: ${payload.remarks}`,
        performedById: actor.userId,
        metadata: {
          partId: existing.partId,
          requestedQuantity: existing.requestedQuantity,
          approvedQuantity: approvedQuantity ?? null,
          remarks: payload.remarks ?? null,
        },
      },
    });

    if (result.outcome === "INSUFFICIENT_STOCK") {
      throw new ConflictError(
        `Insufficient stock to approve this request: ${result.requestedQuantity} requested but only ${result.availableQuantity} available.`,
        {
          outcome: "INSUFFICIENT_STOCK",
          requestId: existing.id,
          partId: existing.partId,
          partCode: existing.part.partCode,
          requestedQuantity: result.requestedQuantity,
          availableQuantity: result.availableQuantity,
        }
      );
    }

    return TicketWorkflowService.toSparePartRequestDto(result.row);
  }

  /** Bulk-approves every PENDING request on a job card in one call, optionally with per-request
   * edited quantities. Reuses the same per-request approval path (auth, stock check, ledger,
   * requisition stamping) as approveSparePartRequest, one request at a time, so a part with
   * insufficient stock is skipped and reported rather than aborting the whole batch. */
  async approveAllSparePartRequests(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<ApproveAllSparePartRequestsResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateApproveAllSparePartRequestsDto(input);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      if (actor.role !== "SERVICE_TL") {
        throw new ForbiddenError("Only the assigned Service Engineer can approve spare part requests.");
      }
      const ticket = await this.repository.findWorkflowContext(ticketId);
      if (ticket?.serviceTlId !== actor.userId) {
        throw new ForbiddenError("Only the assigned Service Engineer can approve spare part requests.");
      }
    }

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    const allRequests = await this.repository.findSparePartRequests(jobCard.id);
    const pending = allRequests.filter((request) => request.status === "PENDING");

    const overrideByRequestId = new Map((payload.items ?? []).map((item) => [item.requestId, item.approvedQuantity]));
    const targets = payload.items ? pending.filter((request) => overrideByRequestId.has(request.id)) : pending;

    const approved: SparePartRequestDto[] = [];
    const failed: Array<{ requestId: string; partCode: string; reason: string }> = [];

    for (const request of targets) {
      try {
        const dto = await this.decideSparePartRequest(
          request.id,
          actor,
          { approvedQuantity: overrideByRequestId.get(request.id) },
          "APPROVED"
        );
        approved.push(dto);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Could not approve this request.";
        failed.push({ requestId: request.id, partCode: request.part.partCode, reason });
      }
    }

    return { approved, failed };
  }

  /** Service Engineer/Admin reverses a previously-approved request - returns the deducted stock and unwinds its contribution to the confirmed list. A reason is required. */
  async reverseSparePartRequest(requestIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartRequestDto> {
    const requestId = validateSparePartRequestIdParam(requestIdInput);
    const payload = validateDecideSparePartRequestDto(input);

    if (!payload.remarks) {
      throw new ValidationError("A reason is required to reverse an approved spare part request.");
    }

    const existing = await this.repository.findSparePartRequestById(requestId);
    if (!existing) {
      throw new NotFoundError(`Spare part request with id ${requestId} was not found.`);
    }
    if (existing.status !== "APPROVED") {
      throw new ConflictError("Only an approved spare part request can be reversed.");
    }
    this.assertJobCardEditable(existing.jobCard, actor);

    await this.assertCanDecideSparePartRequest(existing, actor);

    const updated = await this.repository.reverseSparePartRequest({
      requestId,
      reversedById: actor.userId,
      remarks: payload.remarks,
      ticketId: existing.jobCard.ticketId,
      activity: {
        activityType: "SPARE_PART_REQUEST_REVERSED",
        description: `Spare part request reversed: ${existing.requestedQuantity} x ${existing.part.partCode} returned to stock. Reason: ${payload.remarks}`,
        performedById: actor.userId,
        metadata: { partId: existing.partId, requestedQuantity: existing.requestedQuantity, remarks: payload.remarks },
      },
    });

    return TicketWorkflowService.toSparePartRequestDto(updated);
  }

  /** Mirrors assertCanUpdateJobCard: Admin always; Service Engineer only for tickets assigned to them. Technicians may never decide their own requests. */
  private async assertCanDecideSparePartRequest(request: SparePartRequestRow, actor: WorkflowActor): Promise<void> {
    if ((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER")) {
      return;
    }

    if (actor.role === "SERVICE_TL") {
      const ticket = await this.repository.findWorkflowContext(request.jobCard.ticketId);
      if (ticket?.serviceTlId === actor.userId) {
        return;
      }
    }

    throw new ForbiddenError("Only the assigned Service Engineer can approve, reject or reverse this request.");
  }

  /** Returns unused approved spare parts back to live inventory, at the JobCardSparePart aggregate
   * level rather than any one original request. Serves both entry points - the Technician's
   * post-Mark-Complete prompt, and the Service Engineer's "Return to Inventory from Job Card" fallback -
   * since both ultimately act on one ticket's job card. Unlike the request/approve flow, this is a
   * direct one-step action with no separate approval gate. */
  async returnSparePartsToInventory(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<ReturnSparePartsToInventoryResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateReturnSparePartsToInventoryDto(input);

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }

    await this.assertCanReturnSparePartsToInventory(ticketId, jobCard, actor);
    this.assertJobCardEditable(jobCard, actor);

    const result = await this.repository.returnSparePartsToInventory({
      jobCardId: jobCard.id,
      ticketId,
      items: payload.items,
      performedById: actor.userId,
      activity: {
        activityType: "SPARE_PARTS_RETURNED_TO_INVENTORY",
        description: `Unused spare parts returned to inventory by the ${actor.role === "TECHNICIAN" ? "Technician" : "Service Engineer"}.`,
        performedById: actor.userId,
        metadata: { items: payload.items.map((item) => ({ partId: item.partId, returnQuantity: item.returnQuantity })) },
      },
    });

    if (result.outcome === "PART_NOT_APPROVED") {
      throw new ConflictError("This part has no approved quantity on this job card to return.");
    }
    if (result.outcome === "INVALID_QUANTITY") {
      throw new ValidationError(
        `Cannot return ${result.requested} x ${result.partCode}: only ${result.remaining} remain returnable.`
      );
    }

    const detail = await this.getJobCardDetail(ticketId, actor);
    return { items: result.items, spareParts: detail.spareParts };
  }

  /** Admin always; the ticket's assigned Service Engineer; or the job card's own assigned Technician
   * (the only place in the spare-parts flow a Technician acts on their own job card directly). */
  private async assertCanReturnSparePartsToInventory(
    ticketId: string,
    jobCard: JobCardWorkflowContext,
    actor: WorkflowActor
  ): Promise<void> {
    if ((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER")) {
      return;
    }
    if (actor.role === "TECHNICIAN" && jobCard.technicianId === actor.userId) {
      return;
    }
    if (actor.role === "SERVICE_TL") {
      const ticket = await this.repository.findWorkflowContext(ticketId);
      if (ticket?.serviceTlId === actor.userId) {
        return;
      }
    }
    throw new ForbiddenError("Only the assigned Technician, Service Engineer, or an Admin can return parts to inventory for this job card.");
  }

  /** Technician submits a return - staged as PENDING, no inventory effect until a Service Engineer
   * approves it (decideSparePartReturnRequest). Mirrors requestSpareParts' shape/authorization
   * exactly, just for the reverse direction. */
  async submitSparePartReturnRequest(ticketIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartReturnRequestDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateCreateSparePartReturnRequestDto(input);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "TECHNICIAN") {
      throw new ForbiddenError("Only the assigned Technician can submit a return request.");
    }

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }
    if (actor.role === "TECHNICIAN" && jobCard.technicianId !== actor.userId) {
      throw new ForbiddenError("You can only submit return requests for your own job card.");
    }
    this.assertJobCardEditable(jobCard, actor);

    const result = await this.repository.createSparePartReturnRequest({
      jobCardId: jobCard.id,
      partId: payload.partId,
      requestedReturnQuantity: payload.requestedReturnQuantity,
      requestedById: actor.userId,
    });
    if (result.outcome === "PART_NOT_APPROVED") {
      throw new ConflictError("This part has no approved quantity on this job card to return.");
    }

    return TicketWorkflowService.toSparePartReturnRequestDto(result.row);
  }

  async listSparePartReturnRequests(ticketIdInput: unknown, actor: WorkflowActor): Promise<SparePartReturnRequestDto[]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }
    await this.assertCanViewJobCard(ticketId, jobCard, actor);

    const rows = await this.repository.findSparePartReturnRequests(jobCard.id);
    return rows.map(TicketWorkflowService.toSparePartReturnRequestDto);
  }

  async approveSparePartReturnRequest(requestIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartReturnRequestDto> {
    return this.decideSparePartReturnRequest(requestIdInput, actor, input, "APPROVED");
  }

  async rejectSparePartReturnRequest(requestIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<SparePartReturnRequestDto> {
    return this.decideSparePartReturnRequest(requestIdInput, actor, input, "REJECTED");
  }

  /** Physical Issue Control Policy's return-side mirror: only a Service Engineer (assigned to this
   * ticket) or Admin may approve/reject - a Technician can submit a return, never approve one,
   * even their own. */
  private async decideSparePartReturnRequest(
    requestIdInput: unknown,
    actor: WorkflowActor,
    input: unknown,
    decision: "APPROVED" | "REJECTED"
  ): Promise<SparePartReturnRequestDto> {
    const requestId = validateSparePartRequestIdParam(requestIdInput);
    const payload = validateDecideSparePartReturnRequestDto(input);

    const existing = await this.repository.findSparePartReturnRequestById(requestId);
    if (!existing) {
      throw new NotFoundError(`Return request ${requestId} was not found.`);
    }
    if (existing.status !== "PENDING") {
      throw new ConflictError(`This return request has already been decided (${existing.status}).`);
    }
    this.assertJobCardEditable(existing.jobCard, actor);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      if (actor.role !== "SERVICE_TL") {
        throw new ForbiddenError("Only the assigned Service Engineer can approve or reject return requests.");
      }
      const ticket = await this.repository.findWorkflowContext(existing.jobCard.ticketId);
      if (ticket?.serviceTlId !== actor.userId) {
        throw new ForbiddenError("Only the assigned Service Engineer can approve or reject return requests.");
      }
    }

    const result = await this.repository.decideSparePartReturnRequest({
      requestId,
      decision,
      decidedById: actor.userId,
      remarks: payload.remarks,
      approvedReturnQuantity: payload.approvedReturnQuantity,
      ticketId: existing.jobCard.ticketId,
      activity: {
        activityType: decision === "APPROVED" ? "SPARE_PART_RETURN_REQUEST_APPROVED" : "SPARE_PART_RETURN_REQUEST_REJECTED",
        description: `Service Engineer ${decision === "APPROVED" ? "approved" : "rejected"} the return request for ${existing.part.partCode}.`,
        performedById: actor.userId,
        metadata: { partId: existing.partId, requestedReturnQuantity: existing.requestedReturnQuantity, remarks: payload.remarks ?? null },
      },
    });

    if (result.outcome === "PART_NOT_APPROVED") {
      throw new ConflictError("This part has no approved quantity on this job card to return.");
    }
    if (result.outcome === "INVALID_QUANTITY") {
      throw new ValidationError(`Cannot return ${result.requested} x ${existing.part.partCode}: only ${result.remaining} remain returnable.`);
    }

    return TicketWorkflowService.toSparePartReturnRequestDto(result.row);
  }

  /** Technician records how much of an already-issued part was actually used. Never moves
   * inventory - stock already left Central Inventory at issue time (see PhysicalIssueControlPolicy).
   * Capped server-side at requiredQuantity - returnedQuantity so consumed + returned can never
   * exceed what was actually issued. */
  async recordConsumedQuantity(ticketIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<JobCardDetailDto["spareParts"][number]> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload: RecordConsumedQuantityDto = validateRecordConsumedQuantityDto(input);

    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "TECHNICIAN") {
      throw new ForbiddenError("Only the assigned Technician can record consumed quantity.");
    }

    const jobCard = await this.repository.findJobCardContext(ticketId);
    if (!jobCard) {
      throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);
    }
    if (actor.role === "TECHNICIAN" && jobCard.technicianId !== actor.userId) {
      throw new ForbiddenError("You can only record consumption for your own job card.");
    }
    this.assertJobCardEditable(jobCard, actor);

    const result = await this.repository.recordConsumedQuantity({
      jobCardId: jobCard.id,
      partId: payload.partId,
      consumedQuantity: payload.consumedQuantity,
      consumedById: actor.userId,
    });
    if (result.outcome === "PART_NOT_APPROVED") {
      throw new ConflictError("This part has no issued quantity on this job card to record consumption against.");
    }
    if (result.outcome === "EXCEEDS_ISSUED") {
      throw new ValidationError(`Consumed quantity cannot exceed the issued amount still outstanding (${result.maximum}).`);
    }

    return {
      partId: payload.partId,
      partCode: result.row.part.partCode,
      partName: result.row.part.partName,
      availableQuantity: result.row.part.availableQuantity,
      requiredQuantity: result.row.requiredQuantity,
      partCost: result.row.part.partCost.toString(),
      insufficientStock: false,
      returnedQuantity: result.row.returnedQuantity,
      remainingReturnable: result.row.requiredQuantity - result.row.returnedQuantity,
      consumedQuantity: result.row.consumedQuantity,
      unreconciledQuantity: result.row.requiredQuantity - result.row.consumedQuantity - result.row.returnedQuantity,
      billableQuantity: result.row.consumedQuantity,
      rate: result.row.part.partCost.toString(),
      billableAmount: result.row.part.partCost.mul(result.row.consumedQuantity).toFixed(2),
    };
  }

  private static toSparePartReturnRequestDto(row: SparePartReturnRequestRow): SparePartReturnRequestDto {
    return {
      id: row.id,
      jobCardId: row.jobCardId,
      ticketId: row.jobCard.ticketId,
      partId: row.partId,
      partCode: row.part.partCode,
      partName: row.part.partName,
      requestedReturnQuantity: row.requestedReturnQuantity,
      approvedReturnQuantity: row.approvedReturnQuantity,
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

  private static toSparePartRequestDto(row: SparePartRequestRow): SparePartRequestDto {
    return {
      id: row.id,
      jobCardId: row.jobCardId,
      jobCardNumber: row.jobCard.jobCardNumber,
      ticketId: row.jobCard.ticketId,
      partId: row.partId,
      partCode: row.part.partCode,
      partName: row.part.partName,
      availableQuantity: row.part.availableQuantity,
      partCost: row.part.partCost.toString(),
      requestedQuantity: row.requestedQuantity,
      approvedQuantity: row.approvedQuantity,
      status: row.status,
      requestedById: row.requestedById,
      requestedByName: row.requestedBy.name,
      requestedAt: row.requestedAt.toISOString(),
      decidedById: row.decidedById,
      decidedByName: row.decidedBy?.name ?? null,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      decisionRemarks: row.decisionRemarks,
      reversedById: row.reversedById,
      reversedByName: row.reversedBy?.name ?? null,
      reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
      reversalRemarks: row.reversalRemarks,
    };
  }

  async closeTicketDecision(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketCloseDecisionResponseDto> {
    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateTicketCloseDecisionDto(input);

    /** Final closure is a Coordinator action - ticket ownership returns to the Coordinator at RFD. */
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "COORDINATOR") {
      throw new ForbiddenError("Only a Coordinator can record a ticket closure decision.");
    }

    const ticket = await this.repository.findWorkflowContext(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }
    this.assertStage(ticket, "RFD");

    const result = await this.repository.closeTicketDecision(ticketId, payload.decision, payload.remarks, actor.userId);

    return { ticketId, closed: result.closed, remarks: payload.remarks ?? null };
  }

  /** Ready For Deployment is the financial lock point (Amendment 2): once reached, the parts
   * section - consumption, returns, requests, and everything else on the job card - is read-only
   * for everyone except an Administrator or Service Manager, who must explicitly unlock it first. */
  private assertJobCardEditable(jobCard: { workflowStage: JobCardStage }, actor: WorkflowActor): void {
    if (jobCard.workflowStage === "RFD" && (actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      throw new ConflictError("This job card has reached RFD and is read-only. Only an Administrator or Service Manager can edit it.");
    }
  }

  /** Excludes partsTimeline - callers attach it themselves via buildPartsTimeline (an async
   * aggregation this synchronous mapper can't do), so it's never accidentally omitted. */
  private static toJobCardDetailDto(row: JobCardDetailRow): Omit<JobCardDetailDto, "partsTimeline"> {
    const effectiveStatus = computeJobCardEffectiveStatus(row.workflowStage, row.lastEditedAt);

    return {
      id: row.id,
      jobCardNumber: row.jobCardNumber,
      ticketId: row.ticketId,
      ticketNumber: row.ticket.ticketNumber,
      workflowStage: row.workflowStage,
      effectiveStatus,
      effectiveStatusLabel: JOB_CARD_STATUS_LABELS[effectiveStatus],
      technicianId: row.technicianId,
      technicianName: row.technician.name,
      createdAt: row.createdAt.toISOString(),
      createdBy: "System",
      initialObservation: row.initialObservation,
      rootCause: row.rootCause,
      workPerformed: row.workPerformed,
      otherRequirements: row.otherRequirements,
      technicianRemarks: row.technicianRemarks,
      labourCharges: row.labourCharges ? row.labourCharges.toString() : null,
      partsCharges: row.partsCharges ? row.partsCharges.toString() : null,
      otherCharges: row.otherCharges ? row.otherCharges.toString() : null,
      totalCharges: row.totalCharges ? row.totalCharges.toString() : null,
      estimatedCompletionAt: row.estimatedCompletionAt ? row.estimatedCompletionAt.toISOString() : null,
      actualCompletionAt: row.actualCompletionAt ? row.actualCompletionAt.toISOString() : null,
      completedByName: row.completedByName,
      closureRemarks: row.closureRemarks,
      version: row.version,
      lastEditedAt: row.lastEditedAt ? row.lastEditedAt.toISOString() : null,
      partsRequisitionNumber: row.partsRequisitionNumber,
      partsRequisitionCreatedAt: row.partsRequisitionCreatedAt ? row.partsRequisitionCreatedAt.toISOString() : null,
      partsRequisitionClosedAt: row.partsRequisitionClosedAt ? row.partsRequisitionClosedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      repairStartedAt: row.repairStartedAt ? row.repairStartedAt.toISOString() : null,
      readyForDeliveryAt: row.readyForDeliveryAt ? row.readyForDeliveryAt.toISOString() : null,
      readyForDeliveryByName: row.readyForDeliveryBy?.name ?? null,
      finalSparePartsAmount: row.finalSparePartsAmount ? row.finalSparePartsAmount.toString() : null,
      finalBillingSnapshot: (row.finalBillingSnapshot as unknown as FinalBillingSnapshotDto | null) ?? null,
      spareParts: row.spareParts.map((item) => ({
        partId: item.part.id,
        partCode: item.part.partCode,
        partName: item.part.partName,
        availableQuantity: item.part.availableQuantity,
        requiredQuantity: item.requiredQuantity,
        partCost: item.part.partCost.toString(),
        insufficientStock: item.requiredQuantity > item.part.availableQuantity,
        returnedQuantity: item.returnedQuantity,
        remainingReturnable: item.requiredQuantity - item.returnedQuantity,
        consumedQuantity: item.consumedQuantity,
        unreconciledQuantity: item.requiredQuantity - item.consumedQuantity - item.returnedQuantity,
        billableQuantity: item.consumedQuantity,
        rate: item.part.partCost.toString(),
        billableAmount: item.part.partCost.mul(item.consumedQuantity).toFixed(2),
      })),
      editable: row.workflowStage !== "RFD",
      rider: {
        name: row.ticket.customer.name,
        mobile: row.ticket.customer.registeredMobile,
        mvTrackNumber: row.ticket.deployment?.mvTrackNumber ?? null,
        vehicleModel: null,
        vehicleType: row.ticket.vehicleTypeSnapshot,
        registrationNumber: null,
        hub: row.ticket.deployment?.hub?.name ?? null,
      },
      complaint: {
        rideabilityStatus: row.ticket.rideabilityStatus,
        issueCategory: row.ticket.issueCategory.name,
        issueSubcategory: row.ticket.issueItems[0]?.issueSubcategory ?? null,
        riderRemarks: row.ticket.coordinatorNotes,
        riderPhotos: row.ticket.attachments.map((attachment) => attachment.fileUrl),
      },
      assignment: {
        serviceTlName: row.ticket.serviceTl?.name ?? null,
        serviceTlAssignedAt: row.ticket.assignedAt ? row.ticket.assignedAt.toISOString() : null,
        technicianAssignedAt: row.createdAt.toISOString(),
      },
    };
  }

  private toTicketResponse(
    previousStage: TicketWorkflowStage,
    updated: TicketWorkflowRecord
  ): TicketWorkflowTransitionResponseDto {
    return {
      ticketId: updated.id,
      previousStage,
      newStage: updated.workflowStage,
      serviceTlId: updated.serviceTlId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private toJobCardResponse(
    previousStage: JobCardStage,
    updated: JobCardWorkflowRecord
  ): JobCardWorkflowTransitionResponseDto {
    return {
      jobCardId: updated.id,
      ticketId: updated.ticketId,
      previousStage,
      newStage: updated.workflowStage,
      technicianId: updated.technicianId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
