export type WorkshopWorkbenchStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "RFD";

export interface WorkshopWorkbenchSummaryDto {
  openJobCards: number;
  openTickets: number;
  assignedToTechnician: number;
  inProgress: number;
  completed: number;
  readyForDeployment: number;
  returnedToWorkshop: number;
}

export interface WorkshopWorkbenchListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  hub?: string;
  technicianId?: string;
  status?: WorkshopWorkbenchStatus;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface WorkshopWorkbenchJobCardListItemDto {
  jobCardId: string;
  jobCardNumber: string;
  ticketId: string;
  ticketNumber: string;
  riderName: string;
  mobileNumber: string;
  vehicle: string | null;
  hub: string | null;
  technicianId: string;
  technicianName: string;
  status: WorkshopWorkbenchStatus | "WAITING_PARTS";
  statusLabel: string;
  ticketStatus: string;
  priority: string;
  updatedAt: string;
}

export interface WorkshopWorkbenchListResponseDto {
  items: WorkshopWorkbenchJobCardListItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
}
