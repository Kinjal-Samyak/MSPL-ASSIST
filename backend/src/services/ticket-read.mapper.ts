import type { Priority } from "@prisma/client";
import type {
  TicketDetailResponseDto,
  TicketListItemDto,
  TicketListResponseDto,
  TicketStageProgressItemDto,
} from "../dto/ticket.dto";
import type { TicketDetailRecord, TicketListRow } from "../repositories/ticket.repository";
import { computeJobCardEffectiveStatus, JOB_CARD_STATUS_LABELS } from "../utils/job-card-status";
import {
  buildStageTargetsByPriority,
  buildWorkshopTargetsByPriority,
  computeCurrentStage,
  computeStageProgress,
  computeWorkshopSlaStatus,
  type PolicySnapshot,
  type StageProgressItem,
} from "../utils/ticket-sla-engine";

type JobCardLike = {
  createdAt: Date;
  updatedAt: Date;
  vehicleReceivedAt: Date | null;
  repairStartedAt: Date | null;
  actualCompletionAt: Date | null;
  initialObservation: string | null;
  rootCause: string | null;
  sparePartRequests: Array<{ status: string; requestedAt: Date; decidedAt: Date | null }>;
} | null;

function ownerName(
  ownerRole: string,
  ticket: { assignedTo?: { name: string } | null; serviceTl?: { name: string } | null },
  jobCard: { technician?: { name: string } | null } | null
): string | null {
  if (ownerRole === "TECHNICIAN") return jobCard?.technician?.name ?? null;
  if (ownerRole === "SERVICE_TL") return ticket.serviceTl?.name ?? null;
  return ticket.assignedTo?.name ?? null;
}

function computeStages(
  priority: Priority,
  now: Date,
  policySnapshot: PolicySnapshot,
  ticket: { createdAt: Date; openedAt: Date | null; rfdAt: Date | null; customerAcknowledgedAt: Date | null; closedAt: Date | null },
  jobCard: JobCardLike
): StageProgressItem[] {
  const stageTargets = buildStageTargetsByPriority(policySnapshot).get(priority) ?? new Map();
  const atRiskThresholdPct = policySnapshot.slaStatusRule?.atRiskThresholdPct ?? 20;

  return computeStageProgress({
    priority,
    now,
    atRiskThresholdPct,
    stageTargets,
    ticket,
    jobCard,
    sparePartRequests: jobCard?.sparePartRequests ?? [],
  });
}

export class TicketReadMapper {
  static toTicketListResponse(
    rows: TicketListRow[],
    totalRecords: number,
    page: number,
    pageSize: number,
    policySnapshot: PolicySnapshot
  ): TicketListResponseDto {
    const now = new Date();

    const items: TicketListItemDto[] = rows.map((row) => {
      const isClosed = row.status.name === "Closed" || row.status.name === "Cancelled";
      const stages = computeStages(row.priority, now, policySnapshot, {
        createdAt: row.createdAt,
        openedAt: row.openedAt,
        rfdAt: row.rfdAt,
        customerAcknowledgedAt: row.customerAcknowledgedAt,
        closedAt: row.closedAt,
      }, row.jobCard);
      const current = computeCurrentStage(stages, isClosed);

      return {
        id: row.id,
        ticketNumber: row.ticketNumber,
        status: row.status.name,
        priority: row.priority,
        customerName: row.customer.name,
        phoneNumber: row.customer.registeredMobile,
        vehicleNumber: row.deployment?.vehicleNumber ?? null,
        vehicleModel: row.deployment?.vehicleModel?.displayName ?? null,
        mvTrackNumber: row.deployment?.mvTrackNumber ?? null,
        hub: row.deployment?.hub?.name ?? null,
        technician: row.assignedTo?.name ?? null,
        category: row.issueCategory.name,
        createdAt: row.createdAt.toISOString(),
        eta: row.eta ? row.eta.toISOString() : null,
        workflowStage: row.workflowStage,
        serviceTl: row.serviceTl?.name ?? null,
        jobCardNumber: row.jobCard?.jobCardNumber ?? null,
        jobCardStage: row.jobCard?.workflowStage ?? null,
        jobCardEffectiveStatusLabel: row.jobCard
          ? JOB_CARD_STATUS_LABELS[computeJobCardEffectiveStatus(row.jobCard.workflowStage, row.jobCard.lastEditedAt)]
          : null,
        jobCardTechnician: row.jobCard?.technician?.name ?? null,
        currentStage: { key: current.key, label: current.label, status: current.status },
        owner: { role: current.ownerRole, name: ownerName(current.ownerRole, row, row.jobCard) },
        slaStatus: { status: current.slaStatus ?? "ON_TRACK", dueBy: current.dueBy ? current.dueBy.toISOString() : null },
      };
    });

    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toTicketDetailResponse(record: TicketDetailRecord, policySnapshot: PolicySnapshot): TicketDetailResponseDto {
    const now = new Date();
    const isClosed = record.status.name === "Closed" || record.status.name === "Cancelled";
    const stages = computeStages(record.priority, now, policySnapshot, {
      createdAt: record.createdAt,
      openedAt: record.openedAt,
      rfdAt: record.rfdAt,
      customerAcknowledgedAt: record.customerAcknowledgedAt,
      closedAt: record.closedAt,
    }, record.jobCard);

    const workshopTarget = buildWorkshopTargetsByPriority(policySnapshot).get(record.priority) ?? { durationValue: 24, durationUnit: "HOURS" };
    const workshopSla = computeWorkshopSlaStatus({
      ticketCreatedAt: record.createdAt,
      rfdAt: record.rfdAt,
      target: workshopTarget,
      atRiskThresholdPct: policySnapshot.slaStatusRule?.atRiskThresholdPct ?? 20,
      now,
    });

    const stageProgress: TicketStageProgressItemDto[] = stages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      ownerRole: stage.ownerRole,
      ownerName: ownerName(stage.ownerRole, record, record.jobCard),
      status: stage.status,
      startedAt: stage.startedAt ? stage.startedAt.toISOString() : null,
      completedAt: stage.completedAt ? stage.completedAt.toISOString() : null,
      dueBy: stage.dueBy ? stage.dueBy.toISOString() : null,
      slaStatus: stage.slaStatus,
      notApplicable: stage.notApplicable ?? false,
    }));

    return {
      ticketSummary: {
        id: record.id,
        ticketNumber: record.ticketNumber,
        status: record.status.name,
        priority: record.priority,
        source: record.source,
        issueDescription: record.issueDescription,
        category: record.issueCategory.name,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        eta: record.eta ? record.eta.toISOString() : null,
        workflowStage: record.workflowStage,
        closedAt: record.closedAt ? record.closedAt.toISOString() : null,
      },
      workshopSla: {
        status: workshopSla.status,
        startedAt: workshopSla.startedAt.toISOString(),
        dueBy: workshopSla.dueBy.toISOString(),
        completedAt: workshopSla.completedAt ? workshopSla.completedAt.toISOString() : null,
      },
      stageProgress,
      customer: {
        id: record.customer.id,
        name: record.customer.name,
        registeredMobile: record.customer.registeredMobile,
        secondaryMobile: record.customer.alternateMobile,
      },
      vehicle: {
        deploymentId: record.deployment?.id ?? null,
        vehicleNumber: record.deployment?.vehicleNumber ?? null,
        mvTrackNumber: record.deployment?.mvTrackNumber ?? null,
        vehicleModel: record.deployment?.vehicleModel.displayName ?? null,
        hub: record.deployment?.hub.name ?? null,
        rentalStatus: record.deployment?.rentalStatus ?? null,
      },
      technician: {
        id: record.assignedTo?.id ?? null,
        name: record.assignedTo?.name ?? null,
      },
      serviceTl: {
        id: record.serviceTl?.id ?? null,
        name: record.serviceTl?.name ?? null,
      },
      jobCard: record.jobCard
        ? {
            id: record.jobCard.id,
            workflowStage: record.jobCard.workflowStage,
            technicianId: record.jobCard.technician?.id ?? null,
            technicianName: record.jobCard.technician?.name ?? null,
          }
        : null,
      timeline: [
        {
          id: `${record.id}-created`,
          timestamp: record.createdAt.toISOString(),
          title: "Ticket Created",
          description: "Ticket was created.",
          oldStatus: null,
          newStatus: record.status.name,
          updatedBy: null,
        },
        ...record.histories.map((history) => ({
          id: history.id,
          timestamp: history.updatedAt.toISOString(),
          title: "Status Updated",
          description: history.remarks ?? "Status updated.",
          oldStatus: history.oldStatus?.name ?? null,
          newStatus: history.newStatus.name,
          updatedBy: history.updatedBy?.name ?? null,
        })),
      ].sort((a, b) => {
        if (a.timestamp === b.timestamp) {
          return 0;
        }

        return a.timestamp > b.timestamp ? -1 : 1;
      }),
      comments: record.comments.map((comment) => ({
        id: comment.id,
        text: comment.comment,
        isInternal: comment.internal,
        createdAt: comment.createdAt.toISOString(),
        userName: comment.createdBy?.name ?? null,
        userRole: comment.createdBy?.role ?? null,
      })),
      attachments: record.attachments.map((attachment) => ({
        id: attachment.id,
        fileUrl: attachment.fileUrl,
        fileType: attachment.fileType,
        uploadedAt: attachment.uploadedAt.toISOString(),
      })),
      financialSummary: {
        estimatedCharges: record.estimatedCharges ? Number(record.estimatedCharges) : null,
        finalCharges: record.finalCharges ? Number(record.finalCharges) : null,
        coordinatorNotes: record.coordinatorNotes,
      },
      activityLog: record.activities.map((activity) => ({
        id: activity.id,
        activityType: activity.activityType,
        description: activity.description,
        performedAt: activity.performedAt.toISOString(),
        performedBy: activity.performedBy?.name ?? null,
        metadata: activity.metadata,
      })),
      notificationHistory: record.notificationLogs.map((notification) => ({
        id: notification.id,
        channel: notification.channel,
        recipient: record.customer.registeredMobile,
        status: notification.status,
        message: notification.message,
        responseId: notification.responseId,
        sentAt: notification.sentAt ? notification.sentAt.toISOString() : null,
      })),
    };
  }
}
