export interface OpsAdminTicketSearchQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export interface OpsAdminTicketRowDto {
  id: string;
  ticketNumber: string;
  customerName: string;
  mobileNumber: string;
  status: string;
  workflowStage: string;
  priority: string;
  technician: string | null;
  serviceTl: string | null;
  createdAt: string;
  closedAt: string | null;
  deletedAt: string | null;
  deleteReason: string | null;
  deletedByName: string | null;
}

export interface OpsAdminTicketListResponseDto {
  items: OpsAdminTicketRowDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeleteTicketWithReasonDto {
  reason: string;
}

export interface ForceCloseTicketDto {
  reason: string;
}

export interface ReassignTicketDto {
  serviceTlId?: string;
  technicianId?: string;
}

export interface OpsAdminMutationResponseDto {
  ticketId: string;
  status: "SUCCESS";
  message: string;
  updatedAt: string;
}

export interface ActivityTimelineQueryDto {
  page: number;
  pageSize: number;
  ticketNumber?: string;
  activityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityTimelineRowDto {
  id: string;
  ticketId: string;
  ticketNumber: string;
  activityType: string;
  description: string;
  performedByName: string | null;
  performedAt: string;
  metadata: unknown;
}

export interface ActivityTimelineListResponseDto {
  items: ActivityTimelineRowDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
