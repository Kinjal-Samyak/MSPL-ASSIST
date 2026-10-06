/**
 * Presentation models for the Job Workspace. The Job (backend entity: `JobCard`) is the primary
 * entity - a Technician works on Jobs, not Tickets. The Ticket a Job is linked to (backend:
 * `Ticket`, related 1:1 via `JobCard.ticketId`) is represented only as `LinkedTicketReference`, a
 * small read-only pointer for traceability, never as its own primary model.
 *
 * Field names and shapes are mirrored directly from the real backend contract
 * (`JobCardDetailDto` in backend/src/dto/ticket-workflow.dto.ts and the Prisma schema) so wiring
 * `ApiJobDetailsRepository` later is a mapping exercise, not a redesign. Fields the current
 * backend contract doesn't populate yet are explicitly commented as placeholders rather than
 * invented as new business concepts.
 */
export type JobCardStage = 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'RFD';
export type OperationalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/** Matches the value the backend actually persists today (Ticket.rideabilityStatus) - not the
 * aspirational RIDEABLE/NOT_RIDEABLE pair listed in packages/shared-constants. */
export type RideabilityStatus = 'MOVABLE' | 'NOT_MOVABLE';

export interface LinkedTicketReference {
  ticketId: string;
  ticketNumber: string;
  createdAt: string;
  /** Placeholder - no "service request type" concept exists in the backend yet. */
  serviceRequestType: string;
}

export interface JobCustomerInfo {
  name: string;
  registeredMobile: string;
  hub: string | null;
}

export interface JobVehicleInfo {
  mvTrackNumber: string | null;
  /** Always null in today's backend contract (JobCardDetailDto.rider.vehicleModel is hardcoded
   * null pending VehicleModel wiring) - not a gap introduced here. */
  vehicleModel: string | null;
  vehicleType: string | null;
  /** Always null in today's backend contract; shown only for "High Speed" vehicles once the
   * backend populates it. */
  registrationNumber: string | null;
}

export interface JobIssueInfo {
  issueCategory: string;
  /** Mirrors Ticket.issueItems[] (TicketIssueItem.issueSubcategory) - today's JobCardDetailDto
   * only surfaces the first item as a single value, but the underlying relation is a list, so the
   * presentation model stays plural. */
  issueSubcategories: string[];
  rideabilityStatus: RideabilityStatus | null;
  customerRemarks: string | null;
}

/** Mirrors TicketActivity (id, activityType, description, performedById -> performedByName, performedAt). */
export interface JobTimelineEntry {
  id: string;
  activityType: string;
  description: string;
  performedByName: string | null;
  performedAt: string;
}

/** Mirrors TicketAttachment (id, fileType) - `label` stands in for `fileUrl` since mock data never
 * references a real hosted image (see AttachmentsCard for why). */
export interface JobAttachment {
  id: string;
  fileType: string;
  label: string;
}

export interface JobSystemInfo {
  jobId: string;
  linkedTicketId: string;
  /** Mobile-only concept, no backend equivalent - when this device last successfully fetched the job. */
  lastSyncedAt: string;
  appVersion: string;
}

export interface JobDetails {
  jobId: string;
  jobNumber: string;
  status: JobCardStage;
  statusLabel: string;
  priority: OperationalPriority;
  rideabilityStatus: RideabilityStatus | null;
  assignedDate: string | null;
  lastUpdated: string;
  assignedHub: string | null;
  /** Placeholder - the backend doesn't expose a distinct "assigned technician for display"
   * field beyond the session's own identity yet. */
  assignedTechnicianName: string | null;
  linkedTicket: LinkedTicketReference;
  customer: JobCustomerInfo;
  vehicle: JobVehicleInfo;
  issue: JobIssueInfo;
  coordinatorRemarks: string | null;
  timeline: JobTimelineEntry[];
  attachments: JobAttachment[];
  system: JobSystemInfo;
}
