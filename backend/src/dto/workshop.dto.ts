import type { Priority } from "@prisma/client";
import type { OperationalVehicleStatus } from "./operational-provider.dto";

export type WorkshopJobSortBy =
  | "updatedAt"
  | "createdAt"
  | "ticketNumber"
  | "status"
  | "priority"
  | "customerName"
  | "vehicleNumber";
export type SortOrder = "asc" | "desc";

export interface WorkshopJobListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  priority?: Priority;
  technicianId?: string;
  hubName?: string;
  sortBy: WorkshopJobSortBy;
  sortOrder: SortOrder;
}

export interface CreateWorkshopJobDto {
  deploymentId: string;
  issueCategoryId: string;
  issueDescription: string;
  priority: Priority;
  coordinatorNotes?: string;
  eta?: string;
  estimatedCharges?: number;
}

export interface UpdateWorkshopJobDto {
  issueDescription?: string;
  coordinatorNotes?: string;
  eta?: string;
  estimatedCharges?: number;
  finalCharges?: number;
  priority?: Priority;
}

export interface AssignWorkshopJobDto {
  technicianId: string;
  assignmentNotes?: string;
}

export interface WorkshopDashboardDto {
  totalJobs: number;
  openJobs: number;
  assignedJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
}

export interface WorkshopJobListItemDto {
  jobId: string;
  ticketNumber: string;
  status: string;
  priority: Priority;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deploymentId: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  vehicleStatus: OperationalVehicleStatus | null;
  hubName: string;
  technicianId: string | null;
  technicianName: string | null;
  issueCategory: string;
  issueDescription: string;
  createdAt: string;
  updatedAt: string;
  eta: string | null;
}

export interface WorkshopJobListResponseDto {
  items: WorkshopJobListItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopJobDetailDto extends WorkshopJobListItemDto {
  vehicleVin: string | null;
  batteryNumber: string | null;
  registrationNumber: string | null;
  estimatedCharges: string | null;
  finalCharges: string | null;
  coordinatorNotes: string | null;
  openTicketCount: number;
}

export interface WorkshopTimelineQueryDto {
  page: number;
  pageSize: number;
}

export interface WorkshopTimelineEventDto {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface WorkshopTimelineResponseDto {
  items: WorkshopTimelineEventDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopPartItemDto {
  partId: string;
  issueCategory: string;
  description: string;
  issueStatus: string;
  sequenceNumber: number;
}

export interface WorkshopPartsResponseDto {
  items: WorkshopPartItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopAttachmentItemDto {
  attachmentId: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface WorkshopAttachmentsResponseDto {
  items: WorkshopAttachmentItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkshopMutationResponseDto {
  jobId: string;
  ticketNumber: string;
  status: string;
  updatedAt: string;
}
