import type { JobCardStage, OperationalPriority } from './jobDetails.models';

/**
 * The My Jobs list row - deliberately lighter than `JobDetails` (which is loaded separately, per
 * job, through `JobDetailsRepository`). Field names mirror the same backend contract as
 * `JobDetails` (see jobDetails.models.ts) since both ultimately describe a `JobCard` + its linked
 * `Ticket`.
 */
export interface JobListItem {
  jobId: string;
  jobNumber: string;
  linkedTicketId: string;
  linkedTicketNumber: string;
  status: JobCardStage;
  statusLabel: string;
  priority: OperationalPriority;
  customerName: string;
  vehicleType: string | null;
  updatedAt: string;
}
