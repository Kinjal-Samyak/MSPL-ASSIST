/**
 * Single source of truth for Job Card status labels shown across the app (Workshop
 * Workbench, Service Engineer workspace, Technician Console) - mirrors
 * backend/src/utils/job-card-status.ts so every screen agrees on the same wording.
 */
export type JobCardEffectiveStatus =
  'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'RFD';

export const JOB_CARD_STATUS_LABELS: Record<JobCardEffectiveStatus, string> = {
  ASSIGNED: 'Assigned to Technician',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting for Parts',
  COMPLETED: 'Pending Service Engineer Verification',
  RFD: 'Ready for Deployment',
};
