import type { JobCardStage, TicketWorkflowStage } from "@prisma/client";
import { computeJobCardEffectiveStatus, JOB_CARD_STATUS_LABELS } from "./job-card-status";

const CLOSED = "Closed";
const CANCELLED = "Cancelled";

export interface TicketEffectiveStatusInput {
  status: { name: string };
  workflowStage: TicketWorkflowStage;
  jobCard?: { workflowStage: JobCardStage; lastEditedAt: Date | null } | null;
}

/**
 * The single canonical ticket-level status label shown across the app (Coordinator Workbench,
 * Workshop Workbench). Distinct from the job-card-level status in job-card-status.ts - this layers
 * ticket-workflow-stage branches (RFD, Service Engineer Review, Consultation Resolved/Closed/Cancelled)
 * on top of it. Falls back to the raw Status Master name (e.g. "Open", "Reopened") for stages that
 * have no dedicated label (CREATED, REOPENED).
 */
export function computeTicketEffectiveStatus(ticket: TicketEffectiveStatusInput): string {
  if (ticket.status.name === CANCELLED) return CANCELLED;
  if (ticket.status.name === CLOSED) return CLOSED;
  if (ticket.workflowStage === "RFD") return "Ready for Delivery";
  if (ticket.workflowStage === "WORKSHOP_REQUIRED" && ticket.jobCard) {
    return JOB_CARD_STATUS_LABELS[computeJobCardEffectiveStatus(ticket.jobCard.workflowStage, ticket.jobCard.lastEditedAt)];
  }
  if (ticket.workflowStage === "SERVICE_TL_REVIEW") return "Under Service Engineer Review";
  if (ticket.workflowStage === "CONSULTATION_RESOLVED") return CLOSED;
  return ticket.status.name;
}
