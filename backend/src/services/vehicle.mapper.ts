import type {
  DeploymentDetailsDto,
  InventoryVehicleDetailsDto,
} from "../dto/operational-provider.dto";
import type {
  VehicleCurrentDeploymentDto,
  VehicleDashboardDto,
  VehicleDeploymentHistoryResponseDto,
  VehicleDetailDto,
  VehicleDocumentResponseDto,
  VehicleHealthSummaryDto,
  VehicleListItemDto,
  VehicleListResponseDto,
  VehicleMutationResponseDto,
  VehicleServiceHistoryResponseDto,
  VehicleStatusSummaryDto,
  VehicleTimelineResponseDto,
} from "../dto/vehicle.dto";
import type {
  VehicleDocumentRow,
  VehicleServiceHistoryRow,
  VehicleTimelineRow,
} from "../repositories/vehicle.repository";

export class VehicleMapper {
  static toDashboard(vehicles: InventoryVehicleDetailsDto[]): VehicleDashboardDto {
    const byStatus = (status: InventoryVehicleDetailsDto["status"]) =>
      vehicles.filter((vehicle) => vehicle.status === status).length;

    return {
      totalVehicles: vehicles.length,
      availableVehicles: byStatus("AVAILABLE"),
      deployedVehicles: byStatus("DEPLOYED"),
      maintenanceVehicles: byStatus("MAINTENANCE"),
      workshopVehicles: byStatus("WORKSHOP"),
      reservedVehicles: byStatus("RESERVED"),
      inactiveVehicles: byStatus("INACTIVE"),
      revenueFleet: byStatus("DEPLOYED"),
      readyForDeployment: byStatus("AVAILABLE"),
      downFleet: byStatus("WORKSHOP"),
      inventoryHold: byStatus("INACTIVE"),
      fleetUtilizationPercent:
        vehicles.length === 0 ? 0 : Number(((byStatus("DEPLOYED") / vehicles.length) * 100).toFixed(1)),
      availabilityPercent:
        vehicles.length === 0
          ? 0
          : Number((((byStatus("AVAILABLE") + byStatus("DEPLOYED")) / vehicles.length) * 100).toFixed(1)),
      averageDowntimeHours: 0,
      mttrHours: 0,
      vehiclesReadyToday: byStatus("AVAILABLE"),
      waitingForSpare: 0,
      repairInProgress: 0,
      qualityCheck: 0,
      vehiclesAgingOver72Hours: 0,
      readyForDeploymentBreakdown: {
        fromInventory: byStatus("AVAILABLE"),
        fromService: 0,
        deployableToday: byStatus("AVAILABLE"),
      },
      downFleetBreakdown: {
        inspection: byStatus("WORKSHOP"),
        waitingForSpare: 0,
        workInProgress: 0,
        readyForDeployment: 0,
      },
      fleetHealth: { score: 0, label: "Critical" },
      inventoryHoldBreakdown: {
        registrationPending: byStatus("INACTIVE"),
        insurancePending: 0,
        pdiPending: 0,
      },
    };
  }

  static toVehicleListResponse(
    items: VehicleListItemDto[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): VehicleListResponseDto {
    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toVehicleListItem(vehicle: InventoryVehicleDetailsDto): VehicleListItemDto {
    return {
      vehicleId: vehicle.mvTrackNumber,
      mvTrackNumber: vehicle.mvTrackNumber,
      vehicleNumber: vehicle.vehicleNumber,
      registrationNumber: vehicle.registrationNumber,
      modelName: vehicle.modelName,
      modelCode: vehicle.modelCode,
      hubName: vehicle.hub?.hubName ?? null,
      status: vehicle.status,
      currentRiderName: vehicle.currentCustomerName,
      updatedAt: vehicle.updatedAt,
    };
  }

  static toVehicleDetail(vehicle: InventoryVehicleDetailsDto): VehicleDetailDto {
    return {
      vehicleId: vehicle.mvTrackNumber,
      mvTrackNumber: vehicle.mvTrackNumber,
      vehicleNumber: vehicle.vehicleNumber,
      registrationNumber: vehicle.registrationNumber,
      vin: vehicle.vin,
      chassisNumber: vehicle.chassisNumber,
      motorNumber: vehicle.motorNumber,
      batteryNumber: vehicle.batteryNumber,
      modelName: vehicle.modelName,
      modelCode: vehicle.modelCode,
      color: vehicle.color,
      hubName: vehicle.hub?.hubName ?? null,
      status: vehicle.status,
      fdd: vehicle.fdd,
      currentRiderName: vehicle.currentCustomerName,
      currentRiderPhone: vehicle.currentCustomerPhone,
      iotImei: vehicle.iot.imei,
      iotSimNumber: vehicle.iot.simNumber,
      warrantyExpiryDate: vehicle.warrantyExpiryDate,
      insuranceExpiryDate: vehicle.insuranceExpiryDate,
      registrationExpiryDate: vehicle.registrationExpiryDate,
      fitnessExpiryDate: vehicle.fitnessExpiryDate,
      pucExpiryDate: vehicle.pucExpiryDate,
      updatedAt: vehicle.updatedAt,
    };
  }

  static toCurrentDeployment(
    deployment: DeploymentDetailsDto | null,
    riderName: string | null,
    riderPhone: string | null
  ): VehicleCurrentDeploymentDto | null {
    if (!deployment) {
      return null;
    }

    return {
      deploymentId: deployment.deploymentId,
      customerId: deployment.customerId,
      customerName: riderName ?? "Unknown Rider",
      customerPhone: riderPhone ?? "",
      vehicleNumber: deployment.vehicleNumber,
      mvTrackNumber: deployment.mvTrackNumber,
      hubId: deployment.hubId,
      hubName: deployment.hubName,
      modelName: deployment.modelName,
      rentalStatus: deployment.rentalStatus,
      startedAt: deployment.startedAt,
      updatedAt: deployment.updatedAt,
    };
  }

  static toDeploymentHistoryResponse(
    deployments: Array<DeploymentDetailsDto & { customerName: string | null; customerPhone: string | null }>,
    page: number,
    pageSize: number
  ): VehicleDeploymentHistoryResponseDto {
    const totalRecords = deployments.length;
    const start = (page - 1) * pageSize;
    const items = deployments.slice(start, start + pageSize).map((deployment) => ({
      deploymentId: deployment.deploymentId,
      customerId: deployment.customerId,
      customerName: deployment.customerName ?? "Unknown Rider",
      customerPhone: deployment.customerPhone ?? "",
      vehicleNumber: deployment.vehicleNumber,
      mvTrackNumber: deployment.mvTrackNumber,
      hubId: deployment.hubId,
      hubName: deployment.hubName,
      modelName: deployment.modelName,
      rentalStatus: deployment.rentalStatus,
      startedAt: deployment.startedAt,
      updatedAt: deployment.updatedAt,
    }));

    return {
      items,
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toTimelineResponse(
    rows: VehicleTimelineRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): VehicleTimelineResponseDto {
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

  static toServiceHistoryResponse(
    rows: VehicleServiceHistoryRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): VehicleServiceHistoryResponseDto {
    return {
      items: rows.map((row) => ({
        ticketId: row.id,
        ticketNumber: row.ticketNumber,
        issueCategory: row.issueCategory.name,
        status: row.status.name,
        issueDescription: row.issueDescription,
        servicedAt: row.createdAt.toISOString(),
      })),
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toDocumentResponse(
    rows: VehicleDocumentRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): VehicleDocumentResponseDto {
    return {
      items: rows.map((row) => ({
        documentId: row.id,
        ticketId: row.ticket.id,
        ticketNumber: row.ticket.ticketNumber,
        fileName: this.toFileName(row.fileUrl),
        fileType: row.fileType,
        uploadedAt: row.uploadedAt.toISOString(),
      })),
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toStatusSummary(
    vehicleId: string,
    status: InventoryVehicleDetailsDto["status"],
    hasActiveDeployment: boolean,
    openTicketCount: number,
    latestServiceAt: string | null
  ): VehicleStatusSummaryDto {
    return {
      vehicleId,
      status,
      hasActiveDeployment,
      openTicketCount,
      latestServiceAt,
    };
  }

  static toHealthSummary(vehicle: InventoryVehicleDetailsDto): VehicleHealthSummaryDto {
    const now = Date.now();
    const isValid = (dateValue: string | null): boolean => {
      if (!dateValue) return false;
      const parsed = Date.parse(dateValue);
      if (Number.isNaN(parsed)) return false;
      return parsed >= now;
    };

    return {
      vehicleId: vehicle.mvTrackNumber,
      status: vehicle.status,
      warrantyValid: isValid(vehicle.warrantyExpiryDate),
      insuranceValid: isValid(vehicle.insuranceExpiryDate),
      registrationValid: isValid(vehicle.registrationExpiryDate),
      fitnessValid: isValid(vehicle.fitnessExpiryDate),
      pucValid: isValid(vehicle.pucExpiryDate),
      hasIotConnectivity: Boolean(vehicle.iot.imei || vehicle.iot.simNumber),
    };
  }

  static toMutationResponse(vehicle: InventoryVehicleDetailsDto): VehicleMutationResponseDto {
    return {
      vehicleId: vehicle.mvTrackNumber,
      mvTrackNumber: vehicle.mvTrackNumber,
      vehicleNumber: vehicle.vehicleNumber,
      status: vehicle.status,
      updatedAt: vehicle.updatedAt,
    };
  }

  private static toFileName(fileUrl: string): string {
    const parts = fileUrl.split("/");
    return parts[parts.length - 1] || fileUrl;
  }
}

