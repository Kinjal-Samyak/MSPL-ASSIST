import type { LookupWorkshopStatusDto } from "../dto/operational-provider.dto";
import type {
  DeploymentDashboardDto,
  DeploymentDetailDto,
  DeploymentHistoryResponseDto,
  DeploymentListItemDto,
  DeploymentListResponseDto,
  DeploymentMutationResponseDto,
  DeploymentOperationalRecordDto,
  DeploymentPaymentsResponseDto,
  DeploymentStatusDto,
  DeploymentTimelineResponseDto,
} from "../dto/deployment-module.dto";
import type {
  DeploymentHistoryRow,
  DeploymentPaymentRow,
  DeploymentTimelineRow,
} from "../repositories/deployment-module.repository";

export class DeploymentModuleMapper {
  static toDashboard(deployments: DeploymentOperationalRecordDto[], deploymentsWithOpenTickets: number): DeploymentDashboardDto {
    const byStatus = (status: DeploymentOperationalRecordDto["rentalStatus"]) =>
      deployments.filter((item) => item.rentalStatus === status).length;

    return {
      totalDeployments: deployments.length,
      activeDeployments: byStatus("ACTIVE"),
      pendingDeployments: byStatus("PENDING"),
      completedDeployments: byStatus("COMPLETED"),
      maintenanceDeployments: byStatus("MAINTENANCE"),
      deploymentsWithOpenTickets,
    };
  }

  static toListItem(
    deployment: DeploymentOperationalRecordDto,
    vehicleStatus: DeploymentListItemDto["vehicleStatus"]
  ): DeploymentListItemDto {
    return {
      deploymentId: deployment.deploymentId,
      customerId: deployment.customerId,
      customerName: deployment.customerName,
      customerPhone: deployment.customerPhone,
      vehicleNumber: deployment.vehicleNumber,
      mvTrackNumber: deployment.mvTrackNumber,
      modelName: deployment.modelName,
      modelCode: deployment.modelCode,
      hubName: deployment.hubName,
      rentalStatus: deployment.rentalStatus,
      vehicleStatus,
      startedAt: deployment.startedAt,
      updatedAt: deployment.updatedAt,
    };
  }

  static toListResponse(items: DeploymentListItemDto[], totalRecords: number, page: number, pageSize: number): DeploymentListResponseDto {
    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toDetail(item: DeploymentListItemDto, openTicketCount: number, vin: string | null, registrationNumber: string | null, batteryNumber: string | null): DeploymentDetailDto {
    return {
      ...item,
      vehicleVin: vin,
      registrationNumber,
      batteryNumber,
      riderName: item.customerName,
      riderPhone: item.customerPhone,
      openTicketCount,
    };
  }

  static toTimelineResponse(rows: DeploymentTimelineRow[], totalRecords: number, page: number, pageSize: number): DeploymentTimelineResponseDto {
    return {
      items: rows.map((row) => ({
        id: row.id,
        eventType: row.activityType,
        title: row.activityType.replace(/_/g, " "),
        description: row.description,
        occurredAt: row.performedAt.toISOString(),
        referenceId: row.ticketId,
      })),
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toPaymentsResponse(rows: DeploymentPaymentRow[], totalRecords: number, page: number, pageSize: number): DeploymentPaymentsResponseDto {
    return {
      items: rows.map((row) => ({
        paymentId: row.id,
        ticketId: row.id,
        ticketNumber: row.ticketNumber,
        status: row.status.name,
        estimatedCharges: row.estimatedCharges ? row.estimatedCharges.toString() : null,
        finalCharges: row.finalCharges ? row.finalCharges.toString() : null,
        paidAt: row.closedAt ? row.closedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      })),
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toHistoryResponse(rows: DeploymentHistoryRow[], totalRecords: number, page: number, pageSize: number): DeploymentHistoryResponseDto {
    return {
      items: rows.map((row) => ({
        id: row.id,
        ticketId: row.ticketId,
        oldStatus: row.oldStatus?.name ?? null,
        newStatus: row.newStatus.name,
        remarks: row.remarks,
        updatedBy: row.updatedBy?.name ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toStatus(
    deploymentId: string,
    rentalStatus: DeploymentOperationalRecordDto["rentalStatus"],
    latestTicketStatus: string | null,
    openTicketCount: number,
    workflowStatuses: LookupWorkshopStatusDto[]
  ): DeploymentStatusDto {
    return {
      deploymentId,
      rentalStatus,
      latestTicketStatus,
      openTicketCount,
      canClose: openTicketCount === 0,
      canReopen: rentalStatus === "COMPLETED",
      workflowStatuses: workflowStatuses.map((item) => ({ code: item.code, label: item.label })),
    };
  }

  static toMutationResponse(deploymentId: string, rentalStatus: DeploymentOperationalRecordDto["rentalStatus"], updatedAt: string): DeploymentMutationResponseDto {
    return {
      deploymentId,
      rentalStatus,
      updatedAt,
    };
  }
}
