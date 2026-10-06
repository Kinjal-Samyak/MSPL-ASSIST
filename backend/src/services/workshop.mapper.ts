import type { OperationalVehicleStatus } from "../dto/operational-provider.dto";
import type {
  WorkshopAttachmentItemDto,
  WorkshopAttachmentsResponseDto,
  WorkshopDashboardDto,
  WorkshopJobDetailDto,
  WorkshopJobListItemDto,
  WorkshopJobListResponseDto,
  WorkshopMutationResponseDto,
  WorkshopPartItemDto,
  WorkshopPartsResponseDto,
  WorkshopTimelineEventDto,
  WorkshopTimelineResponseDto,
} from "../dto/workshop.dto";
import type { WorkshopAttachmentRow, WorkshopJobRecord, WorkshopPartRow, WorkshopTimelineRow } from "../repositories/workshop.repository";

export class WorkshopMapper {
  private static userVisibleStatus(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (normalized === "open" || normalized === "assigned") return "Inspection";
    if (normalized === "in progress") return "Work In Progress";
    if (normalized === "completed") return "Ready For Deployment";
    return status;
  }
  static toDashboard(
    totalJobs: number,
    openJobs: number,
    assignedJobs: number,
    inProgressJobs: number,
    completedJobs: number,
    cancelledJobs: number
  ): WorkshopDashboardDto {
    return {
      totalJobs,
      openJobs,
      assignedJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs,
    };
  }

  static toJobListItem(record: WorkshopJobRecord, vehicleStatus: OperationalVehicleStatus | null): WorkshopJobListItemDto {
    return {
      jobId: record.id,
      ticketNumber: record.ticketNumber,
      status: this.userVisibleStatus(record.status),
      priority: record.priority,
      customerId: record.customerId,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
      deploymentId: record.deploymentId,
      vehicleNumber: record.vehicleNumber,
      mvTrackNumber: record.mvTrackNumber,
      vehicleStatus,
      hubName: record.hubName,
      technicianId: record.technicianId,
      technicianName: record.technicianName,
      issueCategory: record.issueCategory,
      issueDescription: record.issueDescription,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      eta: record.eta ? record.eta.toISOString() : null,
    };
  }

  static toJobListResponse(items: WorkshopJobListItemDto[], totalRecords: number, page: number, pageSize: number): WorkshopJobListResponseDto {
    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toJobDetail(item: WorkshopJobListItemDto, record: WorkshopJobRecord, openTicketCount: number, vin: string | null, batteryNumber: string | null, registrationNumber: string | null): WorkshopJobDetailDto {
    return {
      ...item,
      vehicleVin: vin,
      batteryNumber,
      registrationNumber,
      estimatedCharges: record.estimatedCharges ? record.estimatedCharges.toString() : null,
      finalCharges: record.finalCharges ? record.finalCharges.toString() : null,
      coordinatorNotes: record.coordinatorNotes,
      openTicketCount,
    };
  }

  static toTimelineResponse(rows: WorkshopTimelineRow[], totalRecords: number, page: number, pageSize: number): WorkshopTimelineResponseDto {
    const items: WorkshopTimelineEventDto[] = rows.map((row) => ({
      id: row.id,
      eventType: row.activityType,
      title: row.activityType.replace(/_/g, " "),
      description: row.description,
      occurredAt: row.performedAt.toISOString(),
      referenceId: row.ticketId,
    }));

    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toPartsResponse(rows: WorkshopPartRow[], totalRecords: number, page: number, pageSize: number): WorkshopPartsResponseDto {
    const items: WorkshopPartItemDto[] = rows.map((row) => ({
      partId: row.id,
      issueCategory: row.issueCategory.name,
      description: row.issueDescription,
      issueStatus: row.issueStatus,
      sequenceNumber: row.sequenceNumber,
    }));

    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toAttachmentsResponse(rows: WorkshopAttachmentRow[], totalRecords: number, page: number, pageSize: number): WorkshopAttachmentsResponseDto {
    const items: WorkshopAttachmentItemDto[] = rows.map((row) => ({
      attachmentId: row.id,
      fileName: this.fileName(row.fileUrl),
      fileType: row.fileType,
      uploadedAt: row.uploadedAt.toISOString(),
    }));

    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toMutationResponse(record: WorkshopJobRecord): WorkshopMutationResponseDto {
    return {
      jobId: record.id,
      ticketNumber: record.ticketNumber,
      status: this.userVisibleStatus(record.status),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private static fileName(fileUrl: string): string {
    const parts = fileUrl.split("/");
    return parts[parts.length - 1] || fileUrl;
  }
}
