import type { JobCardStage, Priority, TicketSource, TicketWorkflowStage } from "@prisma/client";

export interface CreateTicketDto {
  registeredMobile: string;
  issueCategoryId: string;
  issueDescription: string;
  source?: TicketSource;
  priority?: Priority;
  estimatedCharges?: number | string;
  finalCharges?: number | string;
  coordinatorNotes?: string;
  sendUpdate?: boolean;
  mvTrackNumber?: string;
  vehicleNumber?: string;
  eta?: string;
}

export interface CreateConversationTicketDto {
  registeredMobile: string;
  mvTrackNumber: string;
  vehicleNumber?: string;
  rideabilityStatus: "MOVABLE" | "NOT_MOVABLE";
  issueGroups: Array<{ issueCategoryId: string; issueSubcategory: string; description?: string }>;
  remarks?: string;
  photoReferences?: Array<{ fileUrl: string; fileType: string }>;
  conversationMetadata?: Record<string, unknown>;
}

export interface ValidatedCreateTicketDto {
  registeredMobile: string;
  issueCategoryId: string;
  issueDescription: string;
  source: TicketSource;
  priority: Priority;
  estimatedCharges?: number;
  finalCharges?: number;
  coordinatorNotes?: string;
  sendUpdate: boolean;
  mvTrackNumber?: string;
  vehicleNumber?: string;
  eta?: string;
}

export interface TicketCreationResultDto {
  ticketId: string;
  ticketNumber: string;
  status: string;
  createdAt: string;
  customerId: string;
  deploymentVerified: boolean;
}

export interface TicketCreationResponseDto {
  existingTicket: boolean;
  ticketId?: string;
  ticketNumber: string;
  createdAt?: string;
  currentStatus?: string;
}

export interface TicketNumberDto {
  ticketNumber: string;
  prefix: string;
  sequence: number;
  generatedAt: Date;
}

export type TicketSortBy =
  | "createdAt"
  | "updatedAt"
  | "ticketNumber"
  | "priority"
  | "status"
  | "customerName"
  | "vehicleNumber"
  | "eta";

export type SortOrder = "asc" | "desc";

export interface TicketListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  priority?: Priority;
  hub?: string;
  technician?: string;
  category?: string;
  /** Document 9, Phase 9.2 - Job Queue filters. Matched against Ticket.vehicleTypeSnapshot and
   * Deployment.vehicleModel.displayName respectively. */
  vehicleType?: string;
  vehicleModel?: string;
  fromDate?: Date;
  toDate?: Date;
  serviceTlId?: string;
  excludeWorkflowStages?: TicketWorkflowStage[];
  sortBy: TicketSortBy;
  sortOrder: SortOrder;
}

export interface TicketCurrentStageDto {
  key: string;
  label: string;
  status: string;
}

export interface TicketOwnerDto {
  role: string;
  name: string | null;
}

export interface TicketSlaStatusDto {
  status: string;
  dueBy: string | null;
}

export interface TicketListItemDto {
  id: string;
  ticketNumber: string;
  status: string;
  priority: Priority;
  customerName: string;
  phoneNumber: string;
  vehicleNumber: string | null;
  vehicleModel: string | null;
  mvTrackNumber: string | null;
  hub: string | null;
  technician: string | null;
  category: string;
  createdAt: string;
  eta: string | null;
  workflowStage: TicketWorkflowStage;
  serviceTl: string | null;
  jobCardNumber: string | null;
  jobCardStage: JobCardStage | null;
  jobCardEffectiveStatusLabel: string | null;
  jobCardTechnician: string | null;
  currentStage: TicketCurrentStageDto;
  owner: TicketOwnerDto;
  slaStatus: TicketSlaStatusDto;
}

export interface TicketListResponseDto {
  items: TicketListItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketTimelineEventDto {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  oldStatus: string | null;
  newStatus: string | null;
  updatedBy: string | null;
}

export interface TicketCommentDetailsDto {
  id: string;
  text: string;
  isInternal: boolean;
  createdAt: string;
  userName: string | null;
  userRole: string | null;
}

export interface TicketAttachmentDetailsDto {
  id: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

export interface TicketActivityDetailsDto {
  id: string;
  activityType: string;
  description: string;
  performedAt: string;
  performedBy: string | null;
  metadata: unknown;
}

export interface TicketNotificationHistoryDto {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  message: string;
  responseId: string | null;
  sentAt: string | null;
}

export interface TicketStageProgressItemDto {
  key: string;
  label: string;
  ownerRole: string;
  ownerName: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  dueBy: string | null;
  slaStatus: string | null;
  notApplicable: boolean;
}

export interface TicketWorkshopSlaDto {
  status: string;
  startedAt: string;
  dueBy: string;
  completedAt: string | null;
}

export interface TicketDetailResponseDto {
  ticketSummary: {
    id: string;
    ticketNumber: string;
    status: string;
    priority: Priority;
    source: TicketSource;
    issueDescription: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    eta: string | null;
    workflowStage: TicketWorkflowStage;
    closedAt: string | null;
  };
  workshopSla: TicketWorkshopSlaDto;
  stageProgress: TicketStageProgressItemDto[];
  customer: {
    id: string;
    name: string;
    registeredMobile: string;
    secondaryMobile: string | null;
  };
  vehicle: {
    deploymentId: string | null;
    vehicleNumber: string | null;
    mvTrackNumber: string | null;
    vehicleModel: string | null;
    hub: string | null;
    rentalStatus: string | null;
  };
  technician: {
    id: string | null;
    name: string | null;
  };
  serviceTl: {
    id: string | null;
    name: string | null;
  };
  jobCard: {
    id: string;
    workflowStage: JobCardStage;
    technicianId: string | null;
    technicianName: string | null;
  } | null;
  timeline: TicketTimelineEventDto[];
  comments: TicketCommentDetailsDto[];
  attachments: TicketAttachmentDetailsDto[];
  financialSummary: {
    estimatedCharges: number | null;
    finalCharges: number | null;
    coordinatorNotes: string | null;
  };
  activityLog: TicketActivityDetailsDto[];
  notificationHistory: TicketNotificationHistoryDto[];
}

export type TicketCommentType = "INTERNAL" | "TECHNICIAN" | "CUSTOMER" | "SYSTEM";

export interface CreateTicketCommentDto {
  commentType: TicketCommentType;
  text: string;
  userName?: string;
  userRole?: string;
}

export interface TicketCommentResponseDto {
  id: string;
  ticketId: string;
  commentType: TicketCommentType;
  text: string;
  userName: string | null;
  userRole: string | null;
  createdAt: string;
}

export interface CreateTicketAttachmentDto {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
}

export interface TicketAttachmentResponseDto {
  id: string;
  ticketId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  fileReference: string;
}

export interface TicketNotificationResponseDto {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  sentTime: string | null;
  deliveryTime: string | null;
}

export interface AssignTechnicianDto {
  technicianId: string;
  assignmentNotes?: string;
}

export interface TicketAssignmentResponseDto {
  ticketId: string;
  technicianId: string;
  technicianName: string;
  assignmentNotes: string | null;
  assignedAt: string;
}

export interface UpdateTicketStatusDto {
  status: string;
  remarks?: string;
}

export interface TicketStatusResponseDto {
  ticketId: string;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
  remarks: string | null;
}

export interface UpdateTicketEtaDto {
  eta: string;
  reason: string;
}

export interface TicketEtaResponseDto {
  ticketId: string;
  previousEta: string | null;
  newEta: string;
  reason: string;
  updatedAt: string;
}

export interface UpdateTicketChargesDto {
  labourCharges: number;
  partsCharges: number;
  discount: number;
  totalCharges: number;
}

export interface TicketChargesResponseDto {
  ticketId: string;
  labourCharges: number;
  partsCharges: number;
  discount: number;
  totalCharges: number;
  updatedAt: string;
}
