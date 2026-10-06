import type { JobCardStage, TicketWorkflowStage } from "@prisma/client";
import type { CommunicationCenterEventType } from "../dto/notification.dto";
import { COMMUNICATION_CENTER_EVENT_TYPES } from "../dto/notification.dto";

export interface TicketCommunicationContext {
  workflowStage: TicketWorkflowStage;
  jobCardStage: JobCardStage | null;
  statusName: string;
}

export interface CommunicationEventAvailability {
  eventType: CommunicationCenterEventType;
  enabled: boolean;
  reason: string;
}

const CLOSED = "Closed";
const CANCELLED = "Cancelled";

/** How many days a ticket can sit in its current stage before an un-sent update becomes urgent (🔴). */
export const COMMUNICATION_HEALTH_URGENT_DAYS = 2;

/**
 * Workflow-aware availability for each of the 11 Communication Center events, driven purely by
 * the ticket's current workflowStage/jobCardStage/status - never by what has or hasn't been sent.
 * Mirrors the spec's example table exactly:
 *   - Before a Job Card exists: Repair Started / Waiting for Parts / Work Completed /
 *     Ready for Delivery / Service Charges are all disabled.
 *   - Once Ready for Delivery is reached: Repair-Started/Waiting-for-Parts remain enabled
 *     (informational, may still be relevant to reference), Work Completed / Ready for Delivery /
 *     Service Charges / Vehicle Pending Pickup Reminder become enabled.
 *   - Once the ticket is Closed: everything is disabled except Ticket Closed and General
 *     Announcement (so the closure notice and ad-hoc messages remain sendable/resendable).
 *   - Once the ticket is Cancelled: everything is disabled except Ticket Cancelled and
 *     General Announcement.
 */
export function getAvailableCommunicationEvents(context: TicketCommunicationContext): CommunicationEventAvailability[] {
  const isClosed = context.statusName === CLOSED;
  const isCancelled = context.statusName === CANCELLED;
  const isTerminal = isClosed || isCancelled;
  const hasJobCard = context.jobCardStage !== null;
  const workCompleted = context.jobCardStage === "COMPLETED" || context.jobCardStage === "RFD";
  const readyForDelivery = context.jobCardStage === "RFD" || context.workflowStage === "RFD";
  const serviceTlAssigned = context.workflowStage !== "CREATED";

  const availability: Record<CommunicationCenterEventType, { enabled: boolean; reason: string }> = {
    TICKET_CREATED: { enabled: !isTerminal, reason: "Sendable any time before the ticket is closed or cancelled." },
    TICKET_ASSIGNED: {
      enabled: !isTerminal && serviceTlAssigned,
      reason: serviceTlAssigned ? "A Service Engineer has been assigned." : "No Service Engineer assigned yet.",
    },
    REPAIR_STARTED: {
      enabled: !isTerminal && hasJobCard,
      reason: hasJobCard ? "Job Card has been created." : "Job Card has not been created yet.",
    },
    WAITING_FOR_PARTS: {
      enabled: !isTerminal && hasJobCard,
      reason: hasJobCard ? "Job Card has been created." : "Job Card has not been created yet.",
    },
    WORK_COMPLETED: {
      enabled: !isTerminal && workCompleted,
      reason: workCompleted ? "Technician has marked the repair complete." : "Repair has not been marked complete yet.",
    },
    READY_FOR_DELIVERY: {
      enabled: !isTerminal && readyForDelivery,
      reason: readyForDelivery ? "Service Engineer has marked the job card Ready for Delivery." : "Not yet Ready for Delivery.",
    },
    TICKET_CHARGES_UPDATED: {
      enabled: !isTerminal && readyForDelivery,
      reason: readyForDelivery ? "Final charges are available at Ready for Delivery." : "Charges are not finalized yet.",
    },
    TICKET_CLOSED: {
      enabled: isClosed,
      reason: isClosed ? "Ticket is closed." : "Ticket is not closed yet.",
    },
    TICKET_CANCELLED: {
      enabled: isCancelled,
      reason: isCancelled ? "Ticket is cancelled." : "Ticket is not cancelled.",
    },
    GENERAL_ANNOUNCEMENT: { enabled: true, reason: "Always available for ad-hoc updates." },
    VEHICLE_PENDING_PICKUP_REMINDER: {
      enabled: !isTerminal && readyForDelivery,
      reason: readyForDelivery ? "Vehicle is ready and awaiting pickup." : "Not yet Ready for Delivery.",
    },
  };

  return COMMUNICATION_CENTER_EVENT_TYPES.map((eventType) => ({
    eventType,
    enabled: availability[eventType].enabled,
    reason: availability[eventType].reason,
  }));
}

/**
 * The single most relevant un-sent update: the last (most-advanced, per COMMUNICATION_CENTER_EVENT_TYPES
 * order) currently-enabled event that has never been sent for this ticket. Returns null once every
 * enabled event has already been communicated (nothing left to suggest).
 */
export function computeSuggestedCommunicationEvent(
  availability: CommunicationEventAvailability[],
  sentEventTypes: ReadonlySet<CommunicationCenterEventType>
): CommunicationCenterEventType | null {
  /** GENERAL_ANNOUNCEMENT is an always-on, ad-hoc event - never the auto-suggested "next milestone" update. */
  const candidates = availability.filter(
    (entry) => entry.enabled && entry.eventType !== "GENERAL_ANNOUNCEMENT" && !sentEventTypes.has(entry.eventType)
  );
  return candidates.length > 0 ? candidates[candidates.length - 1].eventType : null;
}

export type CommunicationHealth = "UP_TO_DATE" | "UPDATE_RECOMMENDED" | "NOT_UPDATED";

/**
 * 🟢 Up to Date - nothing pending, the customer has been told everything relevant so far.
 * 🟡 Update Recommended - internal status moved on, but no communication has gone out yet.
 * 🔴 Customer Not Updated - the ticket has sat in its current stage for COMMUNICATION_HEALTH_URGENT_DAYS+
 *     without the corresponding update being sent (e.g. reached RFD, or waiting on parts, for days).
 */
export function computeCommunicationHealth(params: {
  suggestedEvent: CommunicationCenterEventType | null;
  stageEnteredAt: Date;
  now?: Date;
}): CommunicationHealth {
  if (!params.suggestedEvent) return "UP_TO_DATE";
  const now = params.now ?? new Date();
  const daysInStage = (now.getTime() - params.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysInStage >= COMMUNICATION_HEALTH_URGENT_DAYS ? "NOT_UPDATED" : "UPDATE_RECOMMENDED";
}
