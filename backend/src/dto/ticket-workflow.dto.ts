import type { JobCardStage, SparePartRequestStatus, SparePartReturnRequestStatus, TicketWorkflowStage } from "@prisma/client";

/** Document 9, Phase 9.1 - Service Engineer Dashboard. Scoped to the actor's own tickets
 * (serviceTlId) unless Admin/Service Manager, who see the whole workshop. Every count here reuses
 * existing tables (Ticket, JobCard, JobCardSparePartRequest, JobCardSparePartReturnRequest,
 * TicketActivity, Part, User) - nothing new is persisted for this dashboard. */
export interface ServiceEngineerDashboardDto {
  jobsByStatus: {
    created: number;
    review: number;
    workshopRequired: number;
    rfd: number;
  };
  /** Ticket has this Service Engineer assigned but no Technician yet. */
  jobsAwaitingAssignment: number;
  /** PENDING JobCardSparePartRequest rows. In this system approving a request IS the goods-issue
   * step (inventory deducts atomically on approval - there is no separate issue action), so
   * "Awaiting Parts Approval" and "Awaiting Goods Issue" are necessarily the same queue; both
   * tiles intentionally read this same count rather than inventing a distinct backend stage. */
  jobsAwaitingPartsApproval: number;
  jobsAwaitingGoodsIssue: number;
  /** PENDING JobCardSparePartReturnRequest rows. */
  jobsAwaitingReturnsVerification: number;
  /** Job cards at COMPLETED - the Technician is done, awaiting this Service Engineer's review. */
  jobsReadyForReview: number;
  /** Job cards at RFD - already marked Ready for Delivery, now with the Coordinator. */
  jobsReadyForDelivery: number;
  overdueJobs: number;
  technicianAvailability: {
    available: number;
    busy: number;
    total: number;
  };
  workshopUtilizationPercent: number;
  /** Active parts where availableQuantity has reached or dropped below reorderLevel. */
  inventoryAlerts: number;
  recentActivity: ServiceEngineerActivityItemDto[];
}

export interface ServiceEngineerActivityItemDto {
  id: string;
  ticketId: string;
  ticketNumber: string;
  activityType: string;
  description: string;
  performedByName: string | null;
  performedAt: string;
}

export interface AssignServiceTlDto {
  serviceTlId: string;
  remarks?: string;
}

export interface TransferServiceTlDto {
  serviceTlId: string;
  remarks?: string;
}

export interface ResolveConsultationDto {
  remarks?: string;
}

export interface RequireWorkshopDto {
  technicianId: string;
  remarks?: string;
}

export interface JobCardTransitionDto {
  remarks?: string;
  actualCompletionAt?: string;
  completedByName?: string;
}

export interface TicketClosePaymentDto {
  paymentMode: "NEFT" | "UPI";
  utrNumber: string;
  amount: number;
}

export interface TicketWorkflowTransitionResponseDto {
  ticketId: string;
  previousStage: TicketWorkflowStage;
  newStage: TicketWorkflowStage;
  serviceTlId: string | null;
  updatedAt: string;
}

export interface JobCardWorkflowTransitionResponseDto {
  jobCardId: string;
  ticketId: string;
  previousStage: JobCardStage;
  newStage: JobCardStage;
  technicianId: string;
  updatedAt: string;
}

export interface JobCardListItemDto {
  id: string;
  ticketId: string;
  ticketNumber: string;
  workflowStage: JobCardStage;
  /** Canonical status shown app-wide - see backend/src/utils/job-card-status.ts. */
  effectiveStatus: string;
  effectiveStatusLabel: string;
  technicianId: string;
  customerName: string;
  issueDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveJobCardDetailsDto {
  initialObservation?: string;
  rootCause?: string;
  workPerformed?: string;
  otherRequirements?: string;
  technicianRemarks?: string;
  labourCharges?: number;
  partsCharges?: number;
  otherCharges?: number;
  totalCharges?: number;
  estimatedCompletionAt?: string;
}

export interface JobCardSparePartDto {
  partId: string;
  partCode: string;
  partName: string;
  availableQuantity: number;
  requiredQuantity: number;
  partCost: string;
  /** Informational only - required exceeds available stock. Never blocks saving. */
  insufficientStock: boolean;
  /** Running total already returned to inventory for this job-card+part pair. */
  returnedQuantity: number;
  /** requiredQuantity - returnedQuantity - the cap for a further return-to-inventory action. */
  remainingReturnable: number;
  /** How much of requiredQuantity the Technician has recorded as actually used - never moves
   * inventory (stock already left Central Inventory at issue time). */
  consumedQuantity: number;
  /** requiredQuantity - consumedQuantity - returnedQuantity. Must reach exactly 0 before the Job
   * Card can be marked complete (see runJobCardTransition's markCompleted reconciliation check). */
  unreconciledQuantity: number;
  /** Final Spare Part Billing (Amendment 2) - always equal to consumedQuantity, never
   * requested/approved/issued/returned quantity. A live preview before RFD; once the job card
   * reaches RFD this mirrors the frozen amount in JobCardDetailDto.finalBillingSnapshot instead. */
  billableQuantity: number;
  rate: string;
  billableAmount: string;
}

/** One line of the immutable Final Spare Part Billing snapshot (Amendment 2), frozen the instant
 * a Job Card reaches RFD. Never recalculated afterwards. */
export interface FinalBillingSnapshotItemDto {
  partId: string;
  partCode: string;
  partName: string;
  consumedQuantity: number;
  rate: string;
  amount: string;
}

export interface FinalBillingSnapshotDto {
  readyForDeliveryAt: string;
  readyForDeliveryById: string;
  readyForDeliveryByName: string;
  items: FinalBillingSnapshotItemDto[];
  finalSparePartsTotal: string;
}

export interface JobCardDetailDto {
  id: string;
  jobCardNumber: string;
  ticketId: string;
  ticketNumber: string;
  workflowStage: JobCardStage;
  /** Canonical status shown app-wide - see backend/src/utils/job-card-status.ts. */
  effectiveStatus: string;
  effectiveStatusLabel: string;
  technicianId: string;
  technicianName: string;
  createdAt: string;
  createdBy: string;
  initialObservation: string | null;
  rootCause: string | null;
  workPerformed: string | null;
  otherRequirements: string | null;
  technicianRemarks: string | null;
  labourCharges: string | null;
  partsCharges: string | null;
  otherCharges: string | null;
  totalCharges: string | null;
  estimatedCompletionAt: string | null;
  actualCompletionAt: string | null;
  completedByName: string | null;
  closureRemarks: string | null;
  version: number;
  lastEditedAt: string | null;
  partsRequisitionNumber: string | null;
  partsRequisitionCreatedAt: string | null;
  partsRequisitionClosedAt: string | null;
  updatedAt: string;
  repairStartedAt: string | null;
  spareParts: JobCardSparePartDto[];
  partsTimeline: PartsTimelineEventDto[];
  editable: boolean;
  /** Final Spare Part Billing (Amendment 2). Null until the Service Engineer clicks Ready for
   * Deployment - at that instant the job card becomes the official financial record for spare
   * parts and these fields are frozen for good (see TicketWorkflowService.buildFinalBillingSnapshot). */
  readyForDeliveryAt: string | null;
  readyForDeliveryByName: string | null;
  finalSparePartsAmount: string | null;
  finalBillingSnapshot: FinalBillingSnapshotDto | null;
  rider: {
    name: string;
    mobile: string;
    mvTrackNumber: string | null;
    vehicleModel: string | null;
    vehicleType: string | null;
    registrationNumber: string | null;
    hub: string | null;
  };
  complaint: {
    rideabilityStatus: string | null;
    issueCategory: string;
    issueSubcategory: string | null;
    riderRemarks: string | null;
    riderPhotos: string[];
  };
  assignment: {
    serviceTlName: string | null;
    serviceTlAssignedAt: string | null;
    technicianAssignedAt: string;
  };
}

export interface TicketCloseDecisionDto {
  decision: "YES" | "NO";
  remarks?: string;
}

export interface TicketCloseDecisionResponseDto {
  ticketId: string;
  closed: boolean;
  remarks: string | null;
}

export interface JobCardPdfHistoryItemDto {
  id: string;
  version: number;
  fileName: string;
  generatedAt: string;
  generatedByName: string | null;
}

export interface CreateSparePartRequestItemDto {
  partId: string;
  requestedQuantity: number;
}

export interface CreateSparePartRequestsDto {
  items: CreateSparePartRequestItemDto[];
}

export interface DecideSparePartRequestDto {
  remarks?: string;
  /** Only used when approving - lets the Service Engineer correct the Technician's requested quantity. */
  approvedQuantity?: number;
}

export interface ApproveAllSparePartRequestsItemDto {
  requestId: string;
  approvedQuantity?: number;
}

export interface ApproveAllSparePartRequestsDto {
  items?: ApproveAllSparePartRequestsItemDto[];
}

export interface ApproveAllSparePartRequestsResponseDto {
  approved: SparePartRequestDto[];
  failed: Array<{ requestId: string; partCode: string; reason: string }>;
}

export interface ReturnSparePartsItemDto {
  partId: string;
  returnQuantity: number;
}

export interface ReturnSparePartsToInventoryDto {
  items: ReturnSparePartsItemDto[];
}

export interface ReturnSparePartsToInventoryResponseDto {
  items: Array<{ partId: string; partCode: string; returnQuantity: number }>;
  spareParts: JobCardSparePartDto[];
}

export interface SparePartRequestListResponseDto {
  items: SparePartRequestDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SparePartRequestDto {
  id: string;
  jobCardId: string;
  jobCardNumber: string;
  ticketId: string;
  partId: string;
  partCode: string;
  partName: string;
  availableQuantity: number;
  partCost: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  status: SparePartRequestStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
  reversedById: string | null;
  reversedByName: string | null;
  reversedAt: string | null;
  reversalRemarks: string | null;
}

export interface CreateSparePartReturnRequestDto {
  partId: string;
  requestedReturnQuantity: number;
}

export interface DecideSparePartReturnRequestDto {
  remarks?: string;
  approvedReturnQuantity?: number;
}

export interface SparePartReturnRequestDto {
  id: string;
  jobCardId: string;
  ticketId: string;
  partId: string;
  partCode: string;
  partName: string;
  requestedReturnQuantity: number;
  approvedReturnQuantity: number | null;
  status: SparePartReturnRequestStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
}

export interface RecordConsumedQuantityDto {
  partId: string;
  consumedQuantity: number;
}

export type PartsTimelineStage =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "ISSUED"
  | "CONSUMED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "PENDING_PROCUREMENT";

/** One event in the Job Card Parts Timeline (Document 8) - built entirely from existing data
 * (JobCardSparePartRequest, JobCardSparePartReturnRequest, the PartInventoryTransaction ledger,
 * JobCardSparePart's own consumedQuantity/consumedBy/consumedAt, and ProcurementRequest), never a
 * new event-log table. */
export interface PartsTimelineEventDto {
  stage: PartsTimelineStage;
  partId: string;
  partCode: string;
  partName: string;
  quantity: number;
  userId: string | null;
  userName: string | null;
  timestamp: string;
  remarks: string | null;
}
