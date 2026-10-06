import type { RentalStatus } from "@prisma/client";
import type { OperationalVehicleStatus } from "./operational-provider.dto";

export type DeploymentSortBy =
  | "updatedAt"
  | "startedAt"
  | "customerName"
  | "vehicleNumber"
  | "mvTrackNumber"
  | "rentalStatus";
export type SortOrder = "asc" | "desc";

export interface DeploymentListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  rentalStatus?: RentalStatus;
  hubName?: string;
  modelCode?: string;
  sortBy: DeploymentSortBy;
  sortOrder: SortOrder;
}

export interface DeploymentDashboardDto {
  totalDeployments: number;
  activeDeployments: number;
  pendingDeployments: number;
  completedDeployments: number;
  maintenanceDeployments: number;
  deploymentsWithOpenTickets: number;
}

export interface DeploymentListItemDto {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  modelName: string;
  modelCode: string | null;
  hubName: string;
  rentalStatus: RentalStatus;
  vehicleStatus: OperationalVehicleStatus | null;
  startedAt: string;
  updatedAt: string;
}

export interface DeploymentListResponseDto {
  items: DeploymentListItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentDetailDto extends DeploymentListItemDto {
  vehicleVin: string | null;
  registrationNumber: string | null;
  batteryNumber: string | null;
  riderName: string;
  riderPhone: string;
  openTicketCount: number;
}

export interface DeploymentTimelineEventDto {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface DeploymentTimelineResponseDto {
  items: DeploymentTimelineEventDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentQueryDto {
  page: number;
  pageSize: number;
}

export interface DeploymentPaymentItemDto {
  paymentId: string;
  ticketId: string;
  ticketNumber: string;
  status: string;
  estimatedCharges: string | null;
  finalCharges: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface DeploymentPaymentsResponseDto {
  items: DeploymentPaymentItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentHistoryItemDto {
  id: string;
  ticketId: string;
  oldStatus: string | null;
  newStatus: string;
  remarks: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface DeploymentHistoryResponseDto {
  items: DeploymentHistoryItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeploymentStatusDto {
  deploymentId: string;
  rentalStatus: RentalStatus;
  latestTicketStatus: string | null;
  openTicketCount: number;
  canClose: boolean;
  canReopen: boolean;
  workflowStatuses: Array<{ code: string; label: string }>;
}

export interface DeploymentMutationResponseDto {
  deploymentId: string;
  rentalStatus: RentalStatus;
  updatedAt: string;
}

export interface DeploymentOperationalRecordDto {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  modelName: string;
  modelCode: string | null;
  hubName: string;
  rentalStatus: RentalStatus;
  startedAt: string;
  updatedAt: string;
}
