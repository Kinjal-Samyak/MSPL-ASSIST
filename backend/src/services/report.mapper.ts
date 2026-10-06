import type {
  AdminReportDto,
  CustomerReportDto,
  DeploymentReportDto,
  ExecutiveDashboardDto,
  NotificationReportDto,
  ReportListResponseDto,
  TicketReportDto,
  VehicleReportDto,
  WorkshopReportDto,
} from "../dto/report.dto";

export class ReportMapper {
  static toExecutiveDashboard(input: ExecutiveDashboardDto): ExecutiveDashboardDto {
    return input;
  }

  static toListResponse<T>(items: T[], totalRecords: number, page: number, pageSize: number): ReportListResponseDto<T> {
    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toTicketReport(row: any): TicketReportDto {
    return {
      ticketId: row.id,
      ticketNumber: row.ticketNumber,
      customerName: row.customer?.name ?? "",
      vehicle: row.deployment?.vehicleNumber ?? null,
      hubName: row.deployment?.hub?.name ?? null,
      technicianName: row.assignedTo?.name ?? null,
      status: row.status?.name ?? "",
      category: row.issueCategory?.name ?? "",
      priority: String(row.priority),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toCustomerReport(row: any): CustomerReportDto {
    return {
      customerId: row.id,
      name: row.name,
      mobile: row.registeredMobile,
      status: String(row.status),
      activeDeployments: row._count?.deployments ?? 0,
      ticketsRaised: row._count?.tickets ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toVehicleReport(row: any): VehicleReportDto {
    return {
      deploymentId: row.id,
      vehicleNumber: row.vehicleNumber,
      mvTrackNumber: row.mvTrackNumber,
      vehicleModel: row.vehicleModel?.displayName ?? "",
      customerName: row.customer?.name ?? "",
      hubName: row.hub?.name ?? "",
      rentalStatus: String(row.rentalStatus),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toDeploymentReport(row: any): DeploymentReportDto {
    return {
      deploymentId: row.id,
      customerName: row.customer?.name ?? "",
      vehicleNumber: row.vehicleNumber,
      vehicleModel: row.vehicleModel?.displayName ?? "",
      hubName: row.hub?.name ?? "",
      rentalStatus: String(row.rentalStatus),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toWorkshopReport(row: any): WorkshopReportDto {
    return {
      ticketId: row.id,
      ticketNumber: row.ticketNumber,
      customerName: row.customer?.name ?? "",
      vehicleNumber: row.deployment?.vehicleNumber ?? null,
      technicianName: row.assignedTo?.name ?? null,
      status: row.status?.name ?? "",
      priority: String(row.priority),
      eta: row.eta ? row.eta.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toNotificationReport(row: any): NotificationReportDto {
    return {
      notificationId: row.id,
      eventType: row.eventType,
      sourceModule: row.sourceModule,
      sourceEntityId: row.sourceEntityId,
      channel: row.channel,
      recipient: row.recipient,
      status: row.status,
      retryCount: row.attemptCount,
      read: row.readAt !== null,
      archived: row.archivedAt !== null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toAdminReport(row: any): AdminReportDto {
    return {
      userId: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      role: String(row.role),
      active: row.active,
      hubNames: (row.userHubs ?? []).map((entry: any) => entry.hub.name),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
