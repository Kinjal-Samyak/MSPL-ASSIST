import type { OperationalVehicleStatus } from "./operational-provider.dto";

export type SortOrder = "asc" | "desc";
export type VehicleSortBy = "updatedAt" | "vehicleNumber" | "mvTrackNumber" | "status" | "hubName";

export interface VehicleListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  status?: OperationalVehicleStatus;
  hubName?: string;
  modelCode?: string;
  sortBy: VehicleSortBy;
  sortOrder: SortOrder;
}

export interface VehicleDashboardDto {
  totalVehicles: number;
  availableVehicles: number;
  deployedVehicles: number;
  maintenanceVehicles: number;
  workshopVehicles: number;
  reservedVehicles: number;
  inactiveVehicles: number;
  revenueFleet: number;
  readyForDeployment: number;
  downFleet: number;
  inventoryHold: number;
  fleetUtilizationPercent: number;
  availabilityPercent: number;
  averageDowntimeHours: number;
  mttrHours: number;
  vehiclesReadyToday: number;
  waitingForSpare: number;
  repairInProgress: number;
  qualityCheck: number;
  vehiclesAgingOver72Hours: number;
  readyForDeploymentBreakdown: {
    fromInventory: number;
    fromService: number;
    deployableToday: number;
  };
  downFleetBreakdown: {
    inspection: number;
    waitingForSpare: number;
    workInProgress: number;
    readyForDeployment: number;
  };
  fleetHealth: {
    score: number;
    label: "Excellent" | "Good" | "Attention" | "Critical";
  };
  inventoryHoldBreakdown: {
    registrationPending: number;
    insurancePending: number;
    pdiPending: number;
  };
}

export interface VehicleListItemDto {
  vehicleId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  modelName: string | null;
  modelCode: string | null;
  hubName: string | null;
  status: OperationalVehicleStatus;
  currentRiderName: string | null;
  updatedAt: string;
}

export interface VehicleListResponseDto {
  items: VehicleListItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleDetailDto {
  vehicleId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  vin: string | null;
  chassisNumber: string | null;
  motorNumber: string | null;
  batteryNumber: string | null;
  modelName: string | null;
  modelCode: string | null;
  color: string | null;
  hubName: string | null;
  status: OperationalVehicleStatus;
  fdd: string | null;
  currentRiderName: string | null;
  currentRiderPhone: string | null;
  iotImei: string | null;
  iotSimNumber: string | null;
  warrantyExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  registrationExpiryDate: string | null;
  fitnessExpiryDate: string | null;
  pucExpiryDate: string | null;
  updatedAt: string;
}

export interface VehicleTimelineQueryDto {
  page: number;
  pageSize: number;
}

export interface VehicleTimelineEventDto {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  referenceId?: string;
}

export interface VehicleTimelineResponseDto {
  items: VehicleTimelineEventDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleDeploymentHistoryItemDto {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  hubId: string;
  hubName: string;
  modelName: string;
  rentalStatus: string;
  startedAt: string;
  updatedAt: string;
}

export interface VehicleDeploymentHistoryResponseDto {
  items: VehicleDeploymentHistoryItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleCurrentDeploymentDto {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  hubId: string;
  hubName: string;
  modelName: string;
  rentalStatus: string;
  startedAt: string;
  updatedAt: string;
}

export interface VehicleServiceHistoryItemDto {
  ticketId: string;
  ticketNumber: string;
  issueCategory: string;
  status: string;
  issueDescription: string;
  servicedAt: string;
}

export interface VehicleServiceHistoryResponseDto {
  items: VehicleServiceHistoryItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleDocumentQueryDto {
  page: number;
  pageSize: number;
  fileType?: string;
}

export interface VehicleDocumentItemDto {
  documentId: string;
  ticketId: string;
  ticketNumber: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface VehicleDocumentResponseDto {
  items: VehicleDocumentItemDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleStatusSummaryDto {
  vehicleId: string;
  status: OperationalVehicleStatus;
  hasActiveDeployment: boolean;
  openTicketCount: number;
  latestServiceAt: string | null;
}

export interface VehicleHealthSummaryDto {
  vehicleId: string;
  status: OperationalVehicleStatus;
  warrantyValid: boolean;
  insuranceValid: boolean;
  registrationValid: boolean;
  fitnessValid: boolean;
  pucValid: boolean;
  hasIotConnectivity: boolean;
}

export interface VehicleMutationResponseDto {
  vehicleId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  status: OperationalVehicleStatus;
  updatedAt: string;
}

