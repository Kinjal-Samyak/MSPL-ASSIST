import type { JobCardStage } from "@prisma/client";

/**
 * The single canonical Job Card status shown everywhere in the application (Workshop
 * Workbench, Service Engineer workspace, Technician Console). "ASSIGNED" is not a real
 * JobCardStage - it's IN_PROGRESS with no work recorded yet (lastEditedAt is null),
 * computed here once so every screen agrees on the same value and label.
 */
export type JobCardEffectiveStatus = "ASSIGNED" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" | "RFD";

export const JOB_CARD_STATUS_LABELS: Record<JobCardEffectiveStatus, string> = {
  ASSIGNED: "Assigned to Technician",
  IN_PROGRESS: "In Progress",
  WAITING_PARTS: "Waiting for Parts",
  COMPLETED: "Pending Service Engineer Verification",
  RFD: "Ready for Deployment",
};

export function computeJobCardEffectiveStatus(
  workflowStage: JobCardStage,
  lastEditedAt: Date | null
): JobCardEffectiveStatus {
  if (workflowStage === "IN_PROGRESS" && lastEditedAt === null) {
    return "ASSIGNED";
  }
  return workflowStage;
}
