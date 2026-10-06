import type { CustomerStatus, RentalStatus, Role } from "@prisma/client";

export type SortOrder = "asc" | "desc";
export type CustomerSortBy = "name" | "createdAt" | "updatedAt";

export interface CustomerListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  status?: CustomerStatus;
  sortBy: CustomerSortBy;
  sortOrder: SortOrder;
  viewerRole?: Role;
  viewerUserId?: string;
}

export interface CustomerListItemDto {
  customerId: string;
  customerName: string;
  registeredMobile: string;
  alternateMobile: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  status: CustomerStatus;
  activeDeploymentCount: number;
  openTicketCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponseDto {
  items: CustomerListItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<CustomerStatus, number>;
}

export interface CustomerProfileDto {
  customerId: string;
  customerName: string;
  registeredMobile: string;
  alternateMobile: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  address: string | null;
  status: CustomerStatus;
  activeDeploymentCount: number;
  totalDeploymentCount: number;
  openTicketCount: number;
  totalTicketCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  customerName: string;
  registeredMobile: string;
  alternateMobile?: string;
  whatsAppNumber?: string;
  email?: string;
  address?: string;
}

export interface UpdateCustomerDto {
  customerName?: string;
  registeredMobile?: string;
  alternateMobile?: string;
  whatsAppNumber?: string;
  email?: string;
  address?: string;
  status?: CustomerStatus;
}

export interface DeactivateCustomerDto {
  reason: string;
}

export interface CustomerMutationResponseDto {
  customerId: string;
  customerName: string;
  status: CustomerStatus;
  updatedAt: string;
}

export interface CustomerTimelineQueryDto {
  page: number;
  pageSize: number;
}

export type CustomerTimelineEventType =
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_DEACTIVATED"
  | "DEPLOYMENT_CREATED"
  | "TICKET_CREATED"
  | "TICKET_ACTIVITY";

export interface CustomerTimelineEventDto {
  id: string;
  eventType: CustomerTimelineEventType;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface CustomerTimelineResponseDto {
  items: CustomerTimelineEventDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerRentalHistoryQueryDto {
  page: number;
  pageSize: number;
  rentalStatus?: RentalStatus;
  hub?: string;
  search?: string;
}

export interface CustomerRentalHistoryItemDto {
  deploymentId: string;
  vehicleNumber: string;
  batteryNumber: string;
  vehicleModel: string;
  hub: string;
  rentalStatus: RentalStatus;
  deployedAt: string;
}

export interface CustomerRentalHistoryResponseDto {
  items: CustomerRentalHistoryItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerActiveVehicleDto {
  deploymentId: string;
  vehicleNumber: string;
  batteryNumber: string;
  vehicleModel: string;
  hub: string;
  rentalStatus: RentalStatus;
  deployedAt: string;
}

export interface CustomerDocumentQueryDto {
  page: number;
  pageSize: number;
  fileType?: string;
}

export interface CustomerDocumentItemDto {
  documentId: string;
  ticketId: string;
  ticketNumber: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface CustomerDocumentResponseDto {
  items: CustomerDocumentItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
