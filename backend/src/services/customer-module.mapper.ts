import type { CustomerStatus } from "@prisma/client";
import type {
  CustomerActiveVehicleDto,
  CustomerDocumentItemDto,
  CustomerDocumentResponseDto,
  CustomerListItemDto,
  CustomerListResponseDto,
  CustomerMutationResponseDto,
  CustomerProfileDto,
  CustomerRentalHistoryItemDto,
  CustomerRentalHistoryResponseDto,
  CustomerTimelineEventDto,
  CustomerTimelineResponseDto,
} from "../dto/customer-module.dto";
import type {
  CustomerDetailRow,
  CustomerDocumentRow,
  CustomerListRow,
  CustomerRentalHistoryRow,
  CustomerTimelineRow,
} from "../repositories/customer-module.repository";

function toCustomerListItem(item: CustomerListRow): CustomerListItemDto {
  return {
    customerId: item.id,
    customerName: item.name,
    registeredMobile: item.registeredMobile,
    alternateMobile: item.alternateMobile,
    whatsAppNumber: item.whatsAppNumber,
    email: item.email,
    status: item.status,
    activeDeploymentCount: item.deployments.length,
    openTicketCount: item.tickets.length,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toRentalItem(item: CustomerRentalHistoryRow): CustomerRentalHistoryItemDto {
  return {
    deploymentId: item.id,
    vehicleNumber: item.vehicleNumber,
    batteryNumber: item.mvTrackNumber,
    vehicleModel: item.vehicleModel.displayName,
    hub: item.hub.name,
    rentalStatus: item.rentalStatus,
    deployedAt: item.createdAt.toISOString(),
  };
}

function toTimelineTitle(activityType: string): string {
  if (activityType === "Status Updated") return "Ticket status updated";
  if (activityType === "ETA Updated") return "Ticket ETA updated";
  if (activityType === "Technician Assigned") return "Technician assigned";
  if (activityType === "Charges Updated") return "Ticket charges updated";
  if (activityType === "Comment Added") return "Comment added";
  if (activityType === "Attachment Uploaded") return "Attachment uploaded";
  return "Ticket activity";
}

function toTimelineType(activityType: string): CustomerTimelineEventDto["eventType"] {
  if (activityType === "Attachment Uploaded") return "TICKET_ACTIVITY";
  if (activityType === "Comment Added") return "TICKET_ACTIVITY";
  if (activityType === "Status Updated") return "TICKET_ACTIVITY";
  if (activityType === "ETA Updated") return "TICKET_ACTIVITY";
  if (activityType === "Technician Assigned") return "TICKET_ACTIVITY";
  return "TICKET_ACTIVITY";
}

function toDocumentItem(item: CustomerDocumentRow): CustomerDocumentItemDto {
  return {
    documentId: item.id,
    ticketId: item.ticket.id,
    ticketNumber: item.ticket.ticketNumber,
    fileName: item.fileUrl.split("/").pop() ?? item.fileType,
    fileType: item.fileType,
    uploadedAt: item.uploadedAt.toISOString(),
  };
}

export class CustomerModuleMapper {
  static toCustomerListResponse(
    items: CustomerListRow[],
    totalRecords: number,
    page: number,
    pageSize: number,
    statusCounts: Record<CustomerStatus, number> = { ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 }
  ): CustomerListResponseDto {
    return {
      items: items.map(toCustomerListItem),
      totalRecords,
      page,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
      statusCounts,
    };
  }

  static toCustomerProfile(detail: CustomerDetailRow): CustomerProfileDto {
    const openTicketCount = detail.tickets.filter((ticket) => {
      const statusName = ticket.status.name.toLowerCase();
      return statusName !== "closed" && statusName !== "cancelled";
    }).length;
    const activeDeploymentCount = detail.deployments.filter(
      (deployment) => deployment.rentalStatus === "ACTIVE" || deployment.rentalStatus === "PENDING"
    ).length;

    return {
      customerId: detail.id,
      customerName: detail.name,
      registeredMobile: detail.registeredMobile,
      alternateMobile: detail.alternateMobile,
      whatsAppNumber: detail.whatsAppNumber,
      email: detail.email,
      address: detail.address,
      status: detail.status,
      activeDeploymentCount,
      totalDeploymentCount: detail.deployments.length,
      openTicketCount,
      totalTicketCount: detail.tickets.length,
      createdAt: detail.createdAt.toISOString(),
      updatedAt: detail.updatedAt.toISOString(),
    };
  }

  static toMutationResponse(
    customerId: string,
    customerName: string,
    status: CustomerStatus,
    updatedAt: Date
  ): CustomerMutationResponseDto {
    return {
      customerId,
      customerName,
      status,
      updatedAt: updatedAt.toISOString(),
    };
  }

  static toTimelineResponse(
    items: CustomerTimelineRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): CustomerTimelineResponseDto {
    return {
      items: items.map((item) => ({
        id: item.id,
        eventType: toTimelineType(item.activityType),
        title: toTimelineTitle(item.activityType),
        description: item.description,
        occurredAt: item.performedAt.toISOString(),
        referenceId: item.ticketId,
      })),
      totalRecords,
      page,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
    };
  }

  static toRentalHistoryResponse(
    items: CustomerRentalHistoryRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): CustomerRentalHistoryResponseDto {
    return {
      items: items.map(toRentalItem),
      totalRecords,
      page,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
    };
  }

  static toActiveVehicles(items: CustomerRentalHistoryRow[]): CustomerActiveVehicleDto[] {
    return items.map(toRentalItem);
  }

  static toDocumentResponse(
    items: CustomerDocumentRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): CustomerDocumentResponseDto {
    return {
      items: items.map(toDocumentItem),
      totalRecords,
      page,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
    };
  }
}
