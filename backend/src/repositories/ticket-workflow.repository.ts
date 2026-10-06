import type { JobCardStage, Prisma, PrismaClient, SparePartRequestStatus, TicketWorkflowStage } from "@prisma/client";
import { computeDowntimeDays, computeServiceLoss } from "../utils/service-loss";
import { PartInventoryTransactionRepository } from "./part-inventory-transaction.repository";

export interface TicketWorkflowContext {
  id: string;
  ticketNumber: string;
  workflowStage: TicketWorkflowStage;
  serviceTlId: string | null;
  updatedAt: Date;
  status?: { id: string; name: string };
}

export interface TicketWorkflowRecord {
  id: string;
  ticketNumber: string;
  workflowStage: TicketWorkflowStage;
  serviceTlId: string | null;
  updatedAt: Date;
}

export interface JobCardWorkflowContext {
  id: string;
  ticketId: string;
  technicianId: string;
  workflowStage: JobCardStage;
  repairStartedAt: Date | null;
}

export interface JobCardWorkflowRecord {
  id: string;
  ticketId: string;
  technicianId: string;
  workflowStage: JobCardStage;
  updatedAt: Date;
}

export interface TicketWorkflowActivity {
  activityType: string;
  description: string;
  performedById: string;
  metadata: Prisma.InputJsonValue;
}

export interface ApplyTicketTransitionInput {
  ticketId: string;
  data: Prisma.TicketUncheckedUpdateInput;
  activity: TicketWorkflowActivity;
}

export interface CreateJobCardInput {
  ticketId: string;
  technicianId: string;
  /** When set, also resets the ticket's status (used to move a Reopened ticket's status to Open once a technician is assigned). */
  resetStatusId?: string;
  activity: TicketWorkflowActivity;
}

export interface ApplyJobCardTransitionInput {
  ticketId: string;
  jobCardId: string;
  data: Prisma.JobCardUncheckedUpdateInput;
  activity: TicketWorkflowActivity;
}

export interface JobCardListItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  workflowStage: JobCardStage;
  lastEditedAt: Date | null;
  technicianId: string;
  customerName: string;
  issueDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartRecord {
  id: string;
  partCode: string;
  partName: string;
  availableQuantity: number;
}

export interface SparePartRequestRow {
  id: string;
  jobCardId: string;
  partId: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  status: SparePartRequestStatus;
  requestedById: string;
  requestedAt: Date;
  decidedById: string | null;
  decidedAt: Date | null;
  decisionRemarks: string | null;
  reversedById: string | null;
  reversedAt: Date | null;
  reversalRemarks: string | null;
  jobCard: { id: string; jobCardNumber: string; ticketId: string; technicianId: string; workflowStage: JobCardStage };
  part: { id: string; partCode: string; partName: string; availableQuantity: number; partCost: Prisma.Decimal };
  requestedBy: { name: string };
  decidedBy: { name: string } | null;
  reversedBy: { name: string } | null;
}

export type DecideSparePartRequestResult =
  | { outcome: "DECIDED"; row: SparePartRequestRow }
  | { outcome: "INSUFFICIENT_STOCK"; availableQuantity: number; requestedQuantity: number };

export type ReturnSparePartsResult =
  | { outcome: "RETURNED"; items: Array<{ partId: string; partCode: string; returnQuantity: number }> }
  | { outcome: "PART_NOT_APPROVED"; partId: string }
  | { outcome: "INVALID_QUANTITY"; partId: string; partCode: string; remaining: number; requested: number };

export interface JobCardDetailRow {
  id: string;
  jobCardNumber: string;
  ticketId: string;
  technicianId: string;
  workflowStage: JobCardStage;
  initialObservation: string | null;
  rootCause: string | null;
  workPerformed: string | null;
  otherRequirements: string | null;
  technicianRemarks: string | null;
  labourCharges: Prisma.Decimal | null;
  partsCharges: Prisma.Decimal | null;
  otherCharges: Prisma.Decimal | null;
  totalCharges: Prisma.Decimal | null;
  estimatedCompletionAt: Date | null;
  actualCompletionAt: Date | null;
  completedByName: string | null;
  closureRemarks: string | null;
  version: number;
  lastEditedAt: Date | null;
  partsRequisitionNumber: string | null;
  partsRequisitionCreatedAt: Date | null;
  partsRequisitionClosedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  repairStartedAt: Date | null;
  readyForDeliveryAt: Date | null;
  finalSparePartsAmount: Prisma.Decimal | null;
  finalBillingSnapshot: Prisma.JsonValue;
  readyForDeliveryBy: { name: string } | null;
  technician: { id: string; name: string };
  spareParts: Array<{
    requiredQuantity: number;
    returnedQuantity: number;
    consumedQuantity: number;
    part: { id: string; partCode: string; partName: string; availableQuantity: number; partCost: Prisma.Decimal };
  }>;
  ticket: {
    ticketNumber: string;
    vehicleTypeSnapshot: string | null;
    rideabilityStatus: string | null;
    coordinatorNotes: string | null;
    assignedAt: Date | null;
    createdAt: Date;
    serviceTl: { name: string } | null;
    customer: { name: string; registeredMobile: string };
    deployment: { mvTrackNumber: string; hub: { name: string } } | null;
    issueCategory: { name: string };
    issueItems: Array<{ issueSubcategory: string | null }>;
    attachments: Array<{ fileUrl: string }>;
  };
}

const jobCardDetailSelect = {
  id: true,
  jobCardNumber: true,
  ticketId: true,
  technicianId: true,
  workflowStage: true,
  initialObservation: true,
  rootCause: true,
  workPerformed: true,
  otherRequirements: true,
  technicianRemarks: true,
  labourCharges: true,
  partsCharges: true,
  otherCharges: true,
  totalCharges: true,
  estimatedCompletionAt: true,
  actualCompletionAt: true,
  completedByName: true,
  closureRemarks: true,
  version: true,
  lastEditedAt: true,
  partsRequisitionNumber: true,
  partsRequisitionCreatedAt: true,
  partsRequisitionClosedAt: true,
  createdAt: true,
  updatedAt: true,
  repairStartedAt: true,
  readyForDeliveryAt: true,
  finalSparePartsAmount: true,
  finalBillingSnapshot: true,
  readyForDeliveryBy: {
    select: { name: true },
  },
  technician: {
    select: { id: true, name: true },
  },
  spareParts: {
    select: {
      requiredQuantity: true,
      returnedQuantity: true,
      consumedQuantity: true,
      part: {
        select: { id: true, partCode: true, partName: true, availableQuantity: true, partCost: true },
      },
    },
  },
  ticket: {
    select: {
      ticketNumber: true,
      vehicleTypeSnapshot: true,
      rideabilityStatus: true,
      coordinatorNotes: true,
      assignedAt: true,
      createdAt: true,
      serviceTl: { select: { name: true } },
      customer: { select: { name: true, registeredMobile: true } },
      deployment: { select: { mvTrackNumber: true, hub: { select: { name: true } } } },
      issueCategory: { select: { name: true } },
      issueItems: { take: 1, orderBy: { sequenceNumber: "asc" as const }, select: { issueSubcategory: true } },
      attachments: { select: { fileUrl: true } },
    },
  },
} satisfies Prisma.JobCardSelect;

const sparePartRequestSelect = {
  id: true,
  jobCardId: true,
  partId: true,
  requestedQuantity: true,
  approvedQuantity: true,
  status: true,
  requestedById: true,
  requestedAt: true,
  decidedById: true,
  decidedAt: true,
  decisionRemarks: true,
  reversedById: true,
  reversedAt: true,
  reversalRemarks: true,
  jobCard: { select: { id: true, jobCardNumber: true, ticketId: true, technicianId: true, workflowStage: true } },
  part: { select: { id: true, partCode: true, partName: true, availableQuantity: true, partCost: true } },
  requestedBy: { select: { name: true } },
  decidedBy: { select: { name: true } },
  reversedBy: { select: { name: true } },
} satisfies Prisma.JobCardSparePartRequestSelect;

const sparePartReturnRequestSelect = {
  id: true,
  jobCardId: true,
  partId: true,
  requestedReturnQuantity: true,
  approvedReturnQuantity: true,
  status: true,
  requestedById: true,
  requestedAt: true,
  decidedById: true,
  decidedAt: true,
  decisionRemarks: true,
  jobCard: { select: { id: true, ticketId: true, technicianId: true, workflowStage: true } },
  part: { select: { id: true, partCode: true, partName: true, availableQuantity: true, partCost: true } },
  requestedBy: { select: { name: true } },
  decidedBy: { select: { name: true } },
} satisfies Prisma.JobCardSparePartReturnRequestSelect;

export type SparePartReturnRequestRow = Prisma.JobCardSparePartReturnRequestGetPayload<{ select: typeof sparePartReturnRequestSelect }>;

export class TicketWorkflowRepository {
  constructor(private prisma: PrismaClient) {}

  async findWorkflowContext(ticketId: string): Promise<TicketWorkflowContext | null> {
    return this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        ticketNumber: true,
        workflowStage: true,
        serviceTlId: true,
        updatedAt: true,
        status: { select: { id: true, name: true } },
      },
    });
  }

  async findOpenStatusId(): Promise<string | null> {
    const status = await this.prisma.statusMaster.findFirst({
      where: {
        name: {
          equals: "Open",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    return status?.id ?? null;
  }

  async findJobCardContext(ticketId: string): Promise<JobCardWorkflowContext | null> {
    return this.prisma.jobCard.findUnique({
      where: {
        ticketId,
      },
      select: {
        id: true,
        ticketId: true,
        technicianId: true,
        workflowStage: true,
        repairStartedAt: true,
      },
    });
  }

  async findServiceTlById(serviceTlId: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findFirst({
      where: {
        id: serviceTlId,
        role: "SERVICE_TL",
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findTechnicianById(technicianId: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findFirst({
      where: {
        id: technicianId,
        role: "TECHNICIAN",
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findClosedStatusId(): Promise<string | null> {
    const status = await this.prisma.statusMaster.findFirst({
      where: {
        name: {
          equals: "Closed",
          mode: "insensitive",
        },
        active: true,
      },
      select: {
        id: true,
      },
    });

    return status?.id ?? null;
  }

  /** Service Engineer fast-path: close the ticket immediately after Final Verification, skipping the Coordinator's delivery queue. */
  async closeTicketDirectly(
    ticketId: string,
    closedStatusId: string,
    payment: { paymentMode: string; utrNumber: string; amount: number },
    performedById?: string
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          statusId: closedStatusId,
          closedAt: new Date(),
          paymentMode: payment.paymentMode,
          paymentUtrNumber: payment.utrNumber,
          paymentAmount: payment.amount,
          paymentRecordedAt: new Date(),
        },
      }),
      this.prisma.ticketActivity.create({
        data: {
          ticketId,
          activityType: "WORKFLOW_TICKET_CLOSED_BY_SERVICE_TL",
          description: "Ticket closed directly by Service Engineer after final verification.",
          performedById,
          performedAt: new Date(),
        },
      }),
    ]);
  }

  async applyTicketTransition({ ticketId, data, activity }: ApplyTicketTransitionInput): Promise<TicketWorkflowRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data,
        select: {
          id: true,
          ticketNumber: true,
          workflowStage: true,
          serviceTlId: true,
          updatedAt: true,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: activity.activityType,
          description: activity.description,
          performedById: activity.performedById,
          performedAt: new Date(),
          metadata: activity.metadata,
        },
      });

      return updated;
    });
  }

  async createJobCard({ ticketId, technicianId, resetStatusId, activity }: CreateJobCardInput): Promise<JobCardWorkflowRecord> {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          workflowStage: "WORKSHOP_REQUIRED",
          ...(resetStatusId ? { statusId: resetStatusId } : {}),
        },
        select: {
          ticketNumber: true,
        },
      });

      /**
       * Upsert, not create: a ticket returned to the workshop from RFD (CoordinatorWorkbenchService
       * .returnToWorkshop) already has a JobCard row - JobCard is 1:1 with Ticket in the schema, so
       * a plain create() would violate the unique ticketId constraint. Reusing the existing row
       * keeps its jobCardNumber (so it stays identifiable across rework cycles) but resets every
       * other current-state field to what a brand-new job card would start with, giving the new
       * cycle a genuinely fresh diagnostic slate - request history (JobCardSparePartRequest) and
       * PDF history are untouched, preserved as an append-only audit trail across cycles.
       */
      const jobCard = await tx.jobCard.upsert({
        where: {
          ticketId,
        },
        update: {
          technicianId,
          workflowStage: "IN_PROGRESS",
          initialObservation: null,
          rootCause: null,
          workPerformed: null,
          otherRequirements: null,
          technicianRemarks: null,
          labourCharges: null,
          partsCharges: null,
          otherCharges: null,
          totalCharges: null,
          estimatedCompletionAt: null,
          actualCompletionAt: null,
          completedByName: null,
          closureRemarks: null,
          repairStartedAt: null,
          vehicleReceivedAt: new Date(),
          partsRequisitionNumber: null,
          partsRequisitionCreatedAt: null,
          partsRequisitionClosedAt: null,
          version: { increment: 1 },
          lastEditedAt: new Date(),
        },
        create: {
          ticketId,
          technicianId,
          workflowStage: "IN_PROGRESS",
          jobCardNumber: `JC-${ticket.ticketNumber}`,
        },
        select: {
          id: true,
          ticketId: true,
          technicianId: true,
          workflowStage: true,
          updatedAt: true,
        },
      });

      /** Clears the previous cycle's confirmed spare parts list - a no-op on first-ever creation. */
      await tx.jobCardSparePart.deleteMany({ where: { jobCardId: jobCard.id } });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: activity.activityType,
          description: activity.description,
          performedById: activity.performedById,
          performedAt: new Date(),
          metadata: activity.metadata,
        },
      });

      return jobCard;
    });
  }

  private static toJobCardListItem(row: {
    id: string;
    ticketId: string;
    technicianId: string;
    workflowStage: JobCardStage;
    lastEditedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    ticket: { ticketNumber: string; issueDescription: string; customer: { name: string } };
  }): JobCardListItem {
    return {
      id: row.id,
      ticketId: row.ticketId,
      ticketNumber: row.ticket.ticketNumber,
      workflowStage: row.workflowStage,
      lastEditedAt: row.lastEditedAt,
      technicianId: row.technicianId,
      customerName: row.ticket.customer.name,
      issueDescription: row.ticket.issueDescription,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findJobCards(technicianId?: string): Promise<JobCardListItem[]> {
    const rows = await this.prisma.jobCard.findMany({
      where: {
        ticket: { deletedAt: null },
        ...(technicianId ? { technicianId } : {}),
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        ticketId: true,
        technicianId: true,
        workflowStage: true,
        lastEditedAt: true,
        createdAt: true,
        updatedAt: true,
        ticket: {
          select: {
            ticketNumber: true,
            issueDescription: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return rows.map(TicketWorkflowRepository.toJobCardListItem);
  }

  async findJobCardById(jobCardId: string): Promise<JobCardListItem | null> {
    const row = await this.prisma.jobCard.findUnique({
      where: {
        id: jobCardId,
      },
      select: {
        id: true,
        ticketId: true,
        technicianId: true,
        workflowStage: true,
        lastEditedAt: true,
        createdAt: true,
        updatedAt: true,
        ticket: {
          select: {
            ticketNumber: true,
            issueDescription: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return row ? TicketWorkflowRepository.toJobCardListItem(row) : null;
  }

  async applyJobCardTransition({
    ticketId,
    jobCardId,
    data,
    activity,
  }: ApplyJobCardTransitionInput): Promise<JobCardWorkflowRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobCard.update({
        where: {
          id: jobCardId,
        },
        data,
        select: {
          id: true,
          ticketId: true,
          technicianId: true,
          workflowStage: true,
          updatedAt: true,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: activity.activityType,
          description: activity.description,
          performedById: activity.performedById,
          performedAt: new Date(),
          metadata: activity.metadata,
        },
      });

      if (updated.workflowStage === "RFD") {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { workflowStage: "RFD" },
        });

        await this.freezeServiceLoss(tx, ticketId);

        await this.insertCoordinatorNotification(tx, {
          eventType: "JOB_CARD_RFD",
          sourceEntityId: ticketId,
          message: "A Job Card has reached Ready For Deployment (RFD).",
        });
      }

      return updated;
    });
  }

  /**
   * Service Loss Analytics: stamp rfdAt and freeze the loss the first time a ticket reaches RFD.
   * Idempotent (skips silently if rfdAt is already set) so unlock/rework/reopen cycles that bring a
   * ticket back to RFD later never overwrite the original frozen figure. Analytics-only side effect -
   * does not alter the transition's own behavior, response shape or validation.
   */
  private async freezeServiceLoss(tx: Prisma.TransactionClient, ticketId: string): Promise<void> {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: { createdAt: true, rfdAt: true, deploymentId: true },
    });
    if (!ticket || ticket.rfdAt) {
      return;
    }

    const rfdAt = new Date();
    let dailyRental: Prisma.Decimal | null = null;

    if (ticket.deploymentId) {
      const deployment = await tx.deployment.findUnique({
        where: { id: ticket.deploymentId },
        select: { vehicleModelId: true },
      });

      if (deployment) {
        const rate = await tx.vehicleModelRate.findFirst({
          where: {
            vehicleModelId: deployment.vehicleModelId,
            effectiveFrom: { lte: ticket.createdAt },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: ticket.createdAt } }],
          },
          orderBy: { effectiveFrom: "desc" },
        });
        dailyRental = rate?.dailyRental ?? null;
      }
    }

    const downtimeDays = computeDowntimeDays(ticket.createdAt, rfdAt);

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        rfdAt,
        serviceLossFrozenAt: rfdAt,
        ...(dailyRental !== null
          ? {
              serviceLossDailyRental: dailyRental,
              serviceLossAmount: computeServiceLoss(downtimeDays, dailyRental.toNumber()),
            }
          : {}),
      },
    });
  }

  async findJobCardDetail(ticketId: string): Promise<JobCardDetailRow | null> {
    return this.prisma.jobCard.findUnique({
      where: { ticketId },
      select: jobCardDetailSelect,
    });
  }

  async findPartsByIds(partIds: string[]): Promise<PartRecord[]> {
    if (partIds.length === 0) {
      return [];
    }

    return this.prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true, partCode: true, partName: true, availableQuantity: true },
    });
  }

  async saveJobCardDetails(
    jobCardId: string,
    ticketId: string,
    data: Prisma.JobCardUncheckedUpdateInput,
    activity: TicketWorkflowActivity
  ): Promise<JobCardDetailRow> {
    return this.prisma.$transaction(async (tx) => {
      await tx.jobCard.update({
        where: { id: jobCardId },
        data: {
          ...data,
          version: { increment: 1 },
          lastEditedAt: new Date(),
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: activity.activityType,
          description: activity.description,
          performedById: activity.performedById,
          performedAt: new Date(),
          metadata: activity.metadata,
        },
      });

      const detail = await tx.jobCard.findUniqueOrThrow({
        where: { id: jobCardId },
        select: jobCardDetailSelect,
      });

      return detail;
    });
  }

  async createJobCardPdfHistory(input: {
    jobCardId: string;
    version: number;
    fileName: string;
    content: Buffer;
    generatedById: string;
  }): Promise<{ id: string; generatedAt: Date }> {
    return this.prisma.jobCardPdfHistory.create({
      data: {
        jobCardId: input.jobCardId,
        version: input.version,
        fileName: input.fileName,
        content: input.content,
        generatedById: input.generatedById,
      },
      select: {
        id: true,
        generatedAt: true,
      },
    });
  }

  async findJobCardPdfHistory(jobCardId: string): Promise<
    Array<{ id: string; version: number; fileName: string; generatedAt: Date; generatedByName: string | null }>
  > {
    const rows = await this.prisma.jobCardPdfHistory.findMany({
      where: { jobCardId },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        version: true,
        fileName: true,
        generatedAt: true,
        generatedBy: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      fileName: row.fileName,
      generatedAt: row.generatedAt,
      generatedByName: row.generatedBy?.name ?? null,
    }));
  }

  async findJobCardPdfHistoryContent(pdfHistoryId: string): Promise<{
    fileName: string;
    content: Buffer;
    ticketId: string;
    technicianId: string;
  } | null> {
    const row = await this.prisma.jobCardPdfHistory.findUnique({
      where: { id: pdfHistoryId },
      select: {
        fileName: true,
        content: true,
        jobCard: { select: { ticketId: true, technicianId: true } },
      },
    });

    return row
      ? {
          fileName: row.fileName,
          content: Buffer.from(row.content),
          ticketId: row.jobCard.ticketId,
          technicianId: row.jobCard.technicianId,
        }
      : null;
  }

  async closeTicketDecision(
    ticketId: string,
    decision: "YES" | "NO",
    remarks: string | undefined,
    actorId: string
  ): Promise<{ closed: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      if (decision === "YES") {
        const closedStatus = await tx.statusMaster.findFirst({
          where: { name: { equals: "Closed", mode: "insensitive" }, active: true },
          select: { id: true },
        });
        if (!closedStatus) {
          throw new Error("No active 'Closed' status is configured in Status Master.");
        }

        await tx.ticket.update({
          where: { id: ticketId },
          data: { statusId: closedStatus.id, closedAt: new Date() },
        });

        await tx.ticketActivity.create({
          data: {
            ticketId,
            activityType: "WORKFLOW_TICKET_CLOSED",
            description: "Ticket closed following Ready For Deployment.",
            performedById: actorId,
            performedAt: new Date(),
            metadata: { remarks: remarks ?? null },
          },
        });

        await this.insertCoordinatorNotification(tx, {
          eventType: "TICKET_CLOSED",
          sourceEntityId: ticketId,
          message: "A Ticket has been automatically closed after reaching RFD.",
        });

        return { closed: true };
      }

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "WORKFLOW_TICKET_KEPT_OPEN",
          description: "Ticket kept open after reaching RFD.",
          performedById: actorId,
          performedAt: new Date(),
          metadata: { remarks: remarks ?? null },
        },
      });

      return { closed: false };
    });
  }

  private async insertCoordinatorNotification(
    tx: Prisma.TransactionClient,
    input: { eventType: string; sourceEntityId: string; message: string }
  ): Promise<void> {
    await tx.notificationMessage.create({
      data: {
        eventType: input.eventType,
        sourceModule: "job-card",
        sourceEntityId: input.sourceEntityId,
        channel: "IN_APP",
        recipient: "COORDINATOR_TEAM",
        message: input.message,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }

  async createSparePartRequests(
    jobCardId: string,
    ticketId: string,
    requestedById: string,
    items: Array<{ partId: string; requestedQuantity: number }>,
    activity: TicketWorkflowActivity
  ): Promise<SparePartRequestRow[]> {
    return this.prisma.$transaction(async (tx) => {
      const created: SparePartRequestRow[] = [];
      for (const item of items) {
        const row = await tx.jobCardSparePartRequest.create({
          data: {
            jobCardId,
            partId: item.partId,
            requestedQuantity: item.requestedQuantity,
            requestedById,
          },
          select: sparePartRequestSelect,
        });
        created.push(row);
      }

      /** The requisition number should exist as soon as the Technician's first spare-part
       * request is submitted, not only if the Service Engineer separately uses the direct-list save
       * (saveJobCardSpareParts) below - both paths stamp it the same way, first one wins. */
      const existingJobCard = await tx.jobCard.findUniqueOrThrow({
        where: { id: jobCardId },
        select: { jobCardNumber: true, partsRequisitionNumber: true },
      });
      if (!existingJobCard.partsRequisitionNumber) {
        await tx.jobCard.update({
          where: { id: jobCardId },
          data: {
            partsRequisitionNumber: `PR-${existingJobCard.jobCardNumber}`,
            partsRequisitionCreatedAt: new Date(),
          },
        });
      }

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: activity.activityType,
          description: activity.description,
          performedById: activity.performedById,
          performedAt: new Date(),
          metadata: activity.metadata,
        },
      });

      return created;
    });
  }

  async findSparePartRequests(jobCardId: string): Promise<SparePartRequestRow[]> {
    return this.prisma.jobCardSparePartRequest.findMany({
      where: { jobCardId },
      select: sparePartRequestSelect,
      orderBy: { requestedAt: "desc" },
    });
  }

  /** Cross-job-card rollup for Inventory's "Part Requisitions" page - the same data
   * findSparePartRequests returns per job card, just not scoped to one. */
  async listAllSparePartRequests(query: {
    page: number;
    pageSize: number;
    status?: SparePartRequestStatus;
    partCode?: string;
  }): Promise<{ items: SparePartRequestRow[]; totalRecords: number }> {
    const where: Prisma.JobCardSparePartRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.partCode ? { part: { partCode: { contains: query.partCode, mode: "insensitive" } } } : {}),
    };
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.jobCardSparePartRequest.findMany({
        where,
        select: sparePartRequestSelect,
        orderBy: { requestedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.jobCardSparePartRequest.count({ where }),
    ]);
    return { items, totalRecords };
  }

  async findSparePartRequestById(requestId: string): Promise<SparePartRequestRow | null> {
    return this.prisma.jobCardSparePartRequest.findUnique({
      where: { id: requestId },
      select: sparePartRequestSelect,
    });
  }

  /**
   * Approve or reject a PENDING request. On APPROVED, the stock check and deduction happen inside
   * the same transaction as the decision so they stay atomic under concurrent approvals; if stock is
   * insufficient the whole transaction is rolled back and INSUFFICIENT_STOCK is reported instead.
   * On approval, the matching JobCardSparePart row is upserted (created or incremented) - this is
   * purely additive to whatever the Service Engineer has separately saved via saveJobCardSpareParts.
   */
  async decideSparePartRequest(input: {
    requestId: string;
    decision: "APPROVED" | "REJECTED";
    decidedById: string;
    remarks?: string;
    /** Only meaningful when decision is APPROVED - lets the Service Engineer correct the quantity the
     * Technician originally requested. Defaults to the requested quantity when omitted. The
     * original requestedQuantity is never mutated; this is stored separately as approvedQuantity. */
    approvedQuantity?: number;
    ticketId: string;
    activity: TicketWorkflowActivity;
  }): Promise<DecideSparePartRequestResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.jobCardSparePartRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        select: { partId: true, jobCardId: true, requestedQuantity: true, jobCard: { select: { technicianId: true } } },
      });

      const approvedQuantity = input.approvedQuantity ?? existing.requestedQuantity;

      if (input.decision === "APPROVED") {
        const part = await tx.part.findUniqueOrThrow({
          where: { id: existing.partId },
          select: { availableQuantity: true, partCost: true },
        });

        if (part.availableQuantity < approvedQuantity) {
          return {
            outcome: "INSUFFICIENT_STOCK",
            availableQuantity: part.availableQuantity,
            requestedQuantity: approvedQuantity,
          };
        }

        const balanceAfter = part.availableQuantity - approvedQuantity;

        await tx.part.update({
          where: { id: existing.partId },
          data: { availableQuantity: { decrement: approvedQuantity } },
        });

        await tx.jobCardSparePart.upsert({
          where: { jobCardId_partId: { jobCardId: existing.jobCardId, partId: existing.partId } },
          update: { requiredQuantity: { increment: approvedQuantity } },
          create: {
            jobCardId: existing.jobCardId,
            partId: existing.partId,
            requiredQuantity: approvedQuantity,
          },
        });

        const ticket = await tx.ticket.findUnique({
          where: { id: input.ticketId },
          select: { deployment: { select: { hubId: true, vehicleModelId: true } } },
        });

        await new PartInventoryTransactionRepository(tx).record({
          partId: existing.partId,
          transactionType: "ISSUE",
          quantityDelta: -approvedQuantity,
          balanceAfter,
          hubId: ticket?.deployment?.hubId ?? null,
          vehicleModelId: ticket?.deployment?.vehicleModelId ?? null,
          technicianId: existing.jobCard.technicianId,
          jobCardId: existing.jobCardId,
          ticketId: input.ticketId,
          referenceType: "SPARE_PART_REQUEST",
          referenceId: input.requestId,
          unitCost: part.partCost.toString(),
          reason: input.remarks ?? null,
          performedById: input.decidedById,
        });
      }

      const updated = await tx.jobCardSparePartRequest.update({
        where: { id: input.requestId },
        data: {
          status: input.decision,
          approvedQuantity: input.decision === "APPROVED" ? approvedQuantity : null,
          decidedById: input.decidedById,
          decidedAt: new Date(),
          decisionRemarks: input.remarks ?? null,
        },
        select: sparePartRequestSelect,
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: input.ticketId,
          activityType: input.activity.activityType,
          description: input.activity.description,
          performedById: input.activity.performedById,
          performedAt: new Date(),
          metadata: input.activity.metadata,
        },
      });

      return { outcome: "DECIDED", row: updated };
    });
  }

  /** Reverses a previously-APPROVED request: returns the deducted stock and unwinds its contribution to the confirmed JobCardSparePart row (deleting it if this was the only contribution). */
  async reverseSparePartRequest(input: {
    requestId: string;
    reversedById: string;
    remarks: string;
    ticketId: string;
    activity: TicketWorkflowActivity;
  }): Promise<SparePartRequestRow> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.jobCardSparePartRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        select: { partId: true, jobCardId: true, requestedQuantity: true, jobCard: { select: { technicianId: true } } },
      });

      const part = await tx.part.update({
        where: { id: existing.partId },
        data: { availableQuantity: { increment: existing.requestedQuantity } },
        select: { availableQuantity: true, partCost: true },
      });

      const ticket = await tx.ticket.findUnique({
        where: { id: input.ticketId },
        select: { deployment: { select: { hubId: true, vehicleModelId: true } } },
      });

      await new PartInventoryTransactionRepository(tx).record({
        partId: existing.partId,
        transactionType: "RETURN",
        quantityDelta: existing.requestedQuantity,
        balanceAfter: part.availableQuantity,
        hubId: ticket?.deployment?.hubId ?? null,
        vehicleModelId: ticket?.deployment?.vehicleModelId ?? null,
        technicianId: existing.jobCard.technicianId,
        jobCardId: existing.jobCardId,
        ticketId: input.ticketId,
        referenceType: "SPARE_PART_REQUEST",
        referenceId: input.requestId,
        unitCost: part.partCost.toString(),
        reason: input.remarks,
        performedById: input.reversedById,
      });

      const confirmedRow = await tx.jobCardSparePart.findUnique({
        where: { jobCardId_partId: { jobCardId: existing.jobCardId, partId: existing.partId } },
        select: { id: true, requiredQuantity: true },
      });

      if (confirmedRow) {
        if (confirmedRow.requiredQuantity <= existing.requestedQuantity) {
          await tx.jobCardSparePart.delete({ where: { id: confirmedRow.id } });
        } else {
          await tx.jobCardSparePart.update({
            where: { id: confirmedRow.id },
            data: { requiredQuantity: { decrement: existing.requestedQuantity } },
          });
        }
      }

      const updated = await tx.jobCardSparePartRequest.update({
        where: { id: input.requestId },
        data: {
          status: "REVERSED",
          reversedById: input.reversedById,
          reversedAt: new Date(),
          reversalRemarks: input.remarks,
        },
        select: sparePartRequestSelect,
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: input.ticketId,
          activityType: input.activity.activityType,
          description: input.activity.description,
          performedById: input.activity.performedById,
          performedAt: new Date(),
          metadata: input.activity.metadata,
        },
      });

      return updated;
    });
  }

  /** Returns unused approved spare parts back to live inventory, at the JobCardSparePart aggregate
   * level (not tied to any one original request). Capped per (jobCard, part) at requiredQuantity
   * minus whatever has already been returned so far - shared by both the Technician's post-Mark-
   * Complete flow and the Service Engineer's "Return to Inventory from Job Card" fallback, so returns from
   * either entry point stack against the same cap. Validates every item before writing anything, so
   * a bad item in the batch rolls back the whole request rather than partially applying. */
  async returnSparePartsToInventory(input: {
    jobCardId: string;
    ticketId: string;
    items: Array<{ partId: string; returnQuantity: number }>;
    performedById: string;
    activity: TicketWorkflowActivity;
  }): Promise<ReturnSparePartsResult> {
    return this.prisma.$transaction((tx) => TicketWorkflowRepository.applyReturnToInventory(tx, input));
  }

  /** The one place returned-parts inventory actually moves - shared by the direct one-step return
   * (returnSparePartsToInventory, above) and the Return Request approval gate
   * (decideSparePartReturnRequest, below), so approving a return request is never a second
   * implementation of this logic, just a caller that also flips a request row's status inside the
   * same transaction. Must be called from within an existing `tx` - it does not open its own. */
  private static async applyReturnToInventory(
    tx: Prisma.TransactionClient,
    input: {
      jobCardId: string;
      ticketId: string;
      items: Array<{ partId: string; returnQuantity: number }>;
      performedById: string;
      activity: TicketWorkflowActivity;
    }
  ): Promise<ReturnSparePartsResult> {
    const jobCard = await tx.jobCard.findUniqueOrThrow({
      where: { id: input.jobCardId },
      select: { technicianId: true },
    });
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      select: { deployment: { select: { hubId: true, vehicleModelId: true } } },
    });

    const validated: Array<{ partId: string; partCode: string; jobCardSparePartId: string; returnQuantity: number }> = [];

    for (const item of input.items) {
      const confirmedRow = await tx.jobCardSparePart.findUnique({
        where: { jobCardId_partId: { jobCardId: input.jobCardId, partId: item.partId } },
        select: { id: true, requiredQuantity: true, returnedQuantity: true, part: { select: { partCode: true } } },
      });

      if (!confirmedRow) {
        return { outcome: "PART_NOT_APPROVED", partId: item.partId };
      }

      const remaining = confirmedRow.requiredQuantity - confirmedRow.returnedQuantity;
      if (!Number.isInteger(item.returnQuantity) || item.returnQuantity <= 0 || item.returnQuantity > remaining) {
        return {
          outcome: "INVALID_QUANTITY",
          partId: item.partId,
          partCode: confirmedRow.part.partCode,
          remaining,
          requested: item.returnQuantity,
        };
      }

      validated.push({
        partId: item.partId,
        partCode: confirmedRow.part.partCode,
        jobCardSparePartId: confirmedRow.id,
        returnQuantity: item.returnQuantity,
      });
    }

    for (const item of validated) {
      const updatedPart = await tx.part.update({
        where: { id: item.partId },
        data: { availableQuantity: { increment: item.returnQuantity } },
        select: { availableQuantity: true, partCost: true },
      });

      await tx.jobCardSparePart.update({
        where: { id: item.jobCardSparePartId },
        data: { returnedQuantity: { increment: item.returnQuantity } },
      });

      await new PartInventoryTransactionRepository(tx).record({
        partId: item.partId,
        transactionType: "RETURN",
        quantityDelta: item.returnQuantity,
        balanceAfter: updatedPart.availableQuantity,
        hubId: ticket?.deployment?.hubId ?? null,
        vehicleModelId: ticket?.deployment?.vehicleModelId ?? null,
        technicianId: jobCard.technicianId,
        jobCardId: input.jobCardId,
        ticketId: input.ticketId,
        referenceType: "JOB_CARD_PART_RETURN",
        referenceId: item.jobCardSparePartId,
        unitCost: updatedPart.partCost.toString(),
        reason: input.activity.description,
        performedById: input.performedById,
      });
    }

    await tx.ticketActivity.create({
      data: {
        ticketId: input.ticketId,
        activityType: input.activity.activityType,
        description: input.activity.description,
        performedById: input.activity.performedById,
        performedAt: new Date(),
        metadata: input.activity.metadata,
      },
    });

    return { outcome: "RETURNED", items: validated };
  }

  /** Records how much of an already-issued part the Technician actually used - never touches
   * Part.availableQuantity or writes a ledger row (stock already moved at issue time; this is a
   * record of usage, not a transaction). Caps at requiredQuantity - returnedQuantity so consumed +
   * returned can never exceed what was actually issued. */
  /** Job Card Closure Validation: rows where requiredQuantity != consumedQuantity + returnedQuantity -
   * an empty result means every issued spare part is fully reconciled. */
  /** Job Card Parts Timeline (Document 8) data sources - kept on the repository, not called
   * directly from the service via prismaClient, so the service stays testable with a mocked
   * repository like every other method here. */
  async findJobCardIssueAndReturnTransactions(jobCardId: string) {
    return this.prisma.partInventoryTransaction.findMany({
      where: { jobCardId, transactionType: { in: ["ISSUE", "RETURN"] } },
      select: {
        transactionType: true,
        quantityDelta: true,
        createdAt: true,
        reason: true,
        performedById: true,
        performedBy: { select: { name: true } },
        part: { select: { id: true, partCode: true, partName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findConsumedSpareParts(jobCardId: string) {
    return this.prisma.jobCardSparePart.findMany({
      where: { jobCardId, consumedQuantity: { gt: 0 } },
      select: {
        consumedQuantity: true,
        consumedAt: true,
        consumedById: true,
        consumedBy: { select: { name: true } },
        part: { select: { id: true, partCode: true, partName: true } },
      },
    });
  }

  async findProcurementRequestsForJobCard(jobCardId: string) {
    return this.prisma.procurementRequest.findMany({
      where: { jobCardId },
      select: {
        requestNumber: true,
        requestedQuantity: true,
        status: true,
        createdAt: true,
        requestedBy: { select: { name: true } },
        requestedById: true,
        part: { select: { id: true, partCode: true, partName: true } },
      },
    });
  }

  async findUnreconciledSpareParts(
    jobCardId: string
  ): Promise<Array<{ partCode: string; requiredQuantity: number; consumedQuantity: number; returnedQuantity: number }>> {
    const rows = await this.prisma.jobCardSparePart.findMany({
      where: { jobCardId },
      select: { requiredQuantity: true, consumedQuantity: true, returnedQuantity: true, part: { select: { partCode: true } } },
    });
    return rows
      .filter((row) => row.requiredQuantity !== row.consumedQuantity + row.returnedQuantity)
      .map((row) => ({
        partCode: row.part.partCode,
        requiredQuantity: row.requiredQuantity,
        consumedQuantity: row.consumedQuantity,
        returnedQuantity: row.returnedQuantity,
      }));
  }

  /** Final Spare Part Billing (Amendment 2): the exact, consumed-quantity-only basis for the
   * billing snapshot frozen at Ready For Delivery. Deliberately ignores requiredQuantity
   * (requested/approved/issued) and returnedQuantity - only consumedQuantity is ever billable. */
  async findSparePartsForBilling(
    jobCardId: string
  ): Promise<Array<{ partId: string; partCode: string; partName: string; consumedQuantity: number; partCost: Prisma.Decimal }>> {
    const rows = await this.prisma.jobCardSparePart.findMany({
      where: { jobCardId },
      select: { partId: true, consumedQuantity: true, part: { select: { partCode: true, partName: true, partCost: true } } },
    });
    return rows.map((row) => ({
      partId: row.partId,
      partCode: row.part.partCode,
      partName: row.part.partName,
      consumedQuantity: row.consumedQuantity,
      partCost: row.part.partCost,
    }));
  }

  async findUserNameById(userId: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  }

  /** Document 9, Phase 9.1 - Service Engineer Dashboard. serviceTlId null means "every ticket"
   * (Admin/Service Manager); otherwise scoped to this Service Engineer's own tickets. */
  async findServiceEngineerDashboardTickets(serviceTlId: string | null): Promise<
    Array<{
      id: string;
      ticketNumber: string;
      workflowStage: TicketWorkflowStage;
      assignedToId: string | null;
      eta: Date | null;
      closedAt: Date | null;
      jobCard: { id: string; workflowStage: JobCardStage } | null;
    }>
  > {
    return this.prisma.ticket.findMany({
      where: { deletedAt: null, ...(serviceTlId ? { serviceTlId } : {}) },
      select: {
        id: true,
        ticketNumber: true,
        workflowStage: true,
        assignedToId: true,
        eta: true,
        closedAt: true,
        jobCard: { select: { id: true, workflowStage: true } },
      },
    });
  }

  async countPendingSparePartRequests(jobCardIds: string[]): Promise<number> {
    if (jobCardIds.length === 0) return 0;
    return this.prisma.jobCardSparePartRequest.count({ where: { jobCardId: { in: jobCardIds }, status: "PENDING" } });
  }

  async countPendingSparePartReturnRequests(jobCardIds: string[]): Promise<number> {
    if (jobCardIds.length === 0) return 0;
    return this.prisma.jobCardSparePartReturnRequest.count({ where: { jobCardId: { in: jobCardIds }, status: "PENDING" } });
  }

  async findRecentActivityForTickets(
    ticketIds: string[],
    limit: number
  ): Promise<Array<{ id: string; ticketId: string; ticketNumber: string; activityType: string; description: string; performedAt: Date; performedBy: { name: string } | null }>> {
    if (ticketIds.length === 0) return [];
    return this.prisma.ticketActivity.findMany({
      where: { ticketId: { in: ticketIds } },
      orderBy: { performedAt: "desc" },
      take: limit,
      select: {
        id: true,
        ticketId: true,
        activityType: true,
        description: true,
        performedAt: true,
        performedBy: { select: { name: true } },
        ticket: { select: { ticketNumber: true } },
      },
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      ticketId: row.ticketId,
      ticketNumber: (row as unknown as { ticket: { ticketNumber: string } }).ticket.ticketNumber,
      activityType: row.activityType,
      description: row.description,
      performedAt: row.performedAt,
      performedBy: row.performedBy,
    })));
  }

  async findTechnicianWorkloadFlags(): Promise<Array<{ id: string; busy: boolean }>> {
    const technicians = await this.prisma.user.findMany({
      where: { role: "TECHNICIAN", active: true },
      select: { id: true, jobCards: { select: { workflowStage: true } } },
    });
    return technicians.map((technician) => ({
      id: technician.id,
      busy: technician.jobCards.some((jobCard) => jobCard.workflowStage === "IN_PROGRESS" || jobCard.workflowStage === "WAITING_PARTS"),
    }));
  }

  async countLowStockParts(): Promise<number> {
    const parts = await this.prisma.part.findMany({
      where: { active: true },
      select: { availableQuantity: true, reorderLevel: true },
    });
    return parts.filter((part) => part.availableQuantity <= part.reorderLevel).length;
  }

  async recordConsumedQuantity(input: {
    jobCardId: string;
    partId: string;
    consumedQuantity: number;
    consumedById: string;
  }): Promise<
    | {
        outcome: "RECORDED";
        row: {
          requiredQuantity: number;
          returnedQuantity: number;
          consumedQuantity: number;
          part: { partCode: string; partName: string; availableQuantity: number; partCost: Prisma.Decimal };
        };
      }
    | { outcome: "PART_NOT_APPROVED" }
    | { outcome: "EXCEEDS_ISSUED"; maximum: number }
  > {
    const existing = await this.prisma.jobCardSparePart.findUnique({
      where: { jobCardId_partId: { jobCardId: input.jobCardId, partId: input.partId } },
      select: { id: true, requiredQuantity: true, returnedQuantity: true },
    });
    if (!existing) {
      return { outcome: "PART_NOT_APPROVED" };
    }
    const maximum = existing.requiredQuantity - existing.returnedQuantity;
    if (input.consumedQuantity > maximum) {
      return { outcome: "EXCEEDS_ISSUED", maximum };
    }

    const updated = await this.prisma.jobCardSparePart.update({
      where: { id: existing.id },
      data: { consumedQuantity: input.consumedQuantity, consumedById: input.consumedById, consumedAt: new Date() },
      select: {
        requiredQuantity: true,
        returnedQuantity: true,
        consumedQuantity: true,
        part: { select: { partCode: true, partName: true, availableQuantity: true, partCost: true } },
      },
    });
    return { outcome: "RECORDED", row: updated };
  }

  async findSparePartReturnRequests(jobCardId: string): Promise<SparePartReturnRequestRow[]> {
    return this.prisma.jobCardSparePartReturnRequest.findMany({
      where: { jobCardId },
      select: sparePartReturnRequestSelect,
      orderBy: { requestedAt: "desc" },
    });
  }

  async findSparePartReturnRequestById(requestId: string): Promise<SparePartReturnRequestRow | null> {
    return this.prisma.jobCardSparePartReturnRequest.findUnique({
      where: { id: requestId },
      select: sparePartReturnRequestSelect,
    });
  }

  /** Records the Technician's return submission as PENDING - no inventory effect until a Service
   * TL approves it (decideSparePartReturnRequest, below). Rejects outright if there's nothing
   * confirmed on this job card for the part to return in the first place. */
  async createSparePartReturnRequest(input: {
    jobCardId: string;
    partId: string;
    requestedReturnQuantity: number;
    requestedById: string;
  }): Promise<{ outcome: "CREATED"; row: SparePartReturnRequestRow } | { outcome: "PART_NOT_APPROVED" }> {
    const confirmedRow = await this.prisma.jobCardSparePart.findUnique({
      where: { jobCardId_partId: { jobCardId: input.jobCardId, partId: input.partId } },
      select: { requiredQuantity: true, returnedQuantity: true },
    });
    if (!confirmedRow) {
      return { outcome: "PART_NOT_APPROVED" };
    }

    const row = await this.prisma.jobCardSparePartReturnRequest.create({
      data: {
        jobCardId: input.jobCardId,
        partId: input.partId,
        requestedReturnQuantity: input.requestedReturnQuantity,
        requestedById: input.requestedById,
      },
      select: sparePartReturnRequestSelect,
    });
    return { outcome: "CREATED", row };
  }

  /**
   * Approve or reject a PENDING return request. On APPROVED, applyReturnToInventory runs inside
   * the same transaction as the status flip, so a request is never left APPROVED without the
   * matching inventory movement (or vice versa) - this is the only place
   * JobCardSparePartReturnRequest actually moves stock, and it does so by calling the exact same
   * logic the direct one-step return path uses, not a second implementation of it.
   */
  async decideSparePartReturnRequest(input: {
    requestId: string;
    decision: "APPROVED" | "REJECTED";
    decidedById: string;
    remarks?: string;
    /** Only meaningful when decision is APPROVED - lets the Service Engineer correct the quantity after
     * physically verifying the returned parts. Defaults to the requested quantity when omitted. */
    approvedReturnQuantity?: number;
    ticketId: string;
    activity: TicketWorkflowActivity;
  }): Promise<
    | { outcome: "APPROVED_AND_RETURNED"; row: SparePartReturnRequestRow }
    | { outcome: "REJECTED"; row: SparePartReturnRequestRow }
    | { outcome: "PART_NOT_APPROVED" }
    | { outcome: "INVALID_QUANTITY"; remaining: number; requested: number }
  > {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.jobCardSparePartReturnRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        select: { partId: true, jobCardId: true, requestedReturnQuantity: true },
      });
      const returnQuantity = input.approvedReturnQuantity ?? existing.requestedReturnQuantity;

      if (input.decision === "APPROVED") {
        const result = await TicketWorkflowRepository.applyReturnToInventory(tx, {
          jobCardId: existing.jobCardId,
          ticketId: input.ticketId,
          items: [{ partId: existing.partId, returnQuantity }],
          performedById: input.decidedById,
          activity: input.activity,
        });
        if (result.outcome === "PART_NOT_APPROVED") {
          return { outcome: "PART_NOT_APPROVED" };
        }
        if (result.outcome === "INVALID_QUANTITY") {
          return { outcome: "INVALID_QUANTITY", remaining: result.remaining, requested: result.requested };
        }
      }

      const updated = await tx.jobCardSparePartReturnRequest.update({
        where: { id: input.requestId },
        data: {
          status: input.decision,
          approvedReturnQuantity: input.decision === "APPROVED" ? returnQuantity : null,
          decidedById: input.decidedById,
          decidedAt: new Date(),
          decisionRemarks: input.remarks,
        },
        select: sparePartReturnRequestSelect,
      });

      return { outcome: input.decision === "APPROVED" ? "APPROVED_AND_RETURNED" : "REJECTED", row: updated };
    });
  }
}
