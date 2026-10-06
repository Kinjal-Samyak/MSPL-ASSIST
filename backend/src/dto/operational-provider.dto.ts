import type { RentalStatus } from "@prisma/client";

export type OperationalVehicleStatus =
  | "AVAILABLE"
  | "DEPLOYED"
  | "WORKSHOP"
  | "RESERVED"
  | "MAINTENANCE"
  | "INACTIVE"
  | "UNKNOWN";

export interface InventorySourceRecordDto {
  sourceId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  vin: string | null;
  chassisNumber: string | null;
  motorNumber: string | null;
  batteryNumber: string | null;
  modelCode: string | null;
  modelName: string | null;
  color: string | null;
  variant: string | null;
  manufacturer: string | null;
  hubId: string | null;
  hubName: string | null;
  iotImei: string | null;
  iotSimNumber: string | null;
  ownership: string | null;
  purchaseDate: string | null;
  assetCost: string | null;
  warrantyExpiryDate: string | null;
  registrationExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  fitnessExpiryDate: string | null;
  pucExpiryDate: string | null;
  fdd: string | null;
  currentCustomerId: string | null;
  currentCustomerName: string | null;
  currentCustomerPhone: string | null;
  rentalStatus: RentalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryVehicleDetailsDto {
  mvTrackNumber: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  vin: string | null;
  chassisNumber: string | null;
  motorNumber: string | null;
  batteryNumber: string | null;
  modelCode: string | null;
  modelName: string | null;
  color: string | null;
  variant: string | null;
  manufacturer: string | null;
  hub: InventoryHubDto | null;
  status: OperationalVehicleStatus;
  ownership: string | null;
  purchaseDate: string | null;
  assetCost: string | null;
  warrantyExpiryDate: string | null;
  registrationExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  fitnessExpiryDate: string | null;
  pucExpiryDate: string | null;
  fdd: string | null;
  currentCustomerId: string | null;
  currentCustomerName: string | null;
  currentCustomerPhone: string | null;
  iot: InventoryIotDetailsDto;
  updatedAt: string;
}

export interface InventoryVehicleStatusDto {
  mvTrackNumber: string;
  vehicleNumber: string;
  status: OperationalVehicleStatus;
  updatedAt: string;
}

export interface InventoryHubDto {
  hubId: string | null;
  hubName: string | null;
}

export interface InventoryModelDto {
  modelCode: string | null;
  modelName: string | null;
  variant: string | null;
  manufacturer: string | null;
}

export interface InventoryIotDetailsDto {
  imei: string | null;
  simNumber: string | null;
}

export interface DeploymentSourceRecordDto {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  rentalStatus: RentalStatus;
  hubId: string;
  hubName: string;
  modelName: string;
  startedAt: string;
  updatedAt: string;
}

export interface RiderProfileDto {
  customerId: string;
  customerName: string;
  customerPhone: string;
}

export interface DeploymentDetailsDto {
  deploymentId: string;
  customerId: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  rentalStatus: RentalStatus;
  hubId: string;
  hubName: string;
  modelName: string;
  startedAt: string;
  updatedAt: string;
}

export interface AssignedVehicleDto {
  vehicleNumber: string;
  mvTrackNumber: string;
  modelName: string;
}

export interface CurrentHubDto {
  hubId: string;
  hubName: string;
}

export interface LookupHubSourceRecordDto {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface LookupVehicleModelSourceRecordDto {
  id: string;
  modelCode: string;
  displayName: string;
  manufacturer: string;
}

export interface LookupPlanSourceRecordDto {
  planCode: string;
  planName: string;
  description: string | null;
  active: boolean;
}

export interface LookupIssueCategorySourceRecordDto {
  id: string;
  name: string;
  displayOrder: number;
}

export interface LookupTechnicianSourceRecordDto {
  id: string;
  name: string;
  mobile: string;
  tickets: Array<{
    deployment: {
      hub: {
        name: string;
      } | null;
    } | null;
  }>;
}

export interface LookupStatusSourceRecordDto {
  code: string;
  label: string;
}

export interface LookupHubDto {
  hubId: string;
  hubName: string;
  city: string;
  state: string;
}

export interface LookupVehicleModelDto {
  modelId: string;
  modelCode: string;
  modelName: string;
  manufacturer: string;
}

export interface LookupModelCodeDto {
  modelCode: string;
  modelName: string;
}

export interface LookupPlanDto {
  planCode: string;
  planName: string;
  description: string | null;
  active: boolean;
}

export interface LookupIssueCategoryDto {
  issueCategoryId: string;
  issueCategoryName: string;
  displayOrder: number;
}

export interface LookupIssueSubCategoryDto {
  issueCategoryId: string;
  issueCategoryName: string;
  group: string;
  subcategories: string[];
}

export interface LookupTechnicianDto {
  technicianId: string;
  technicianName: string;
  mobileNumber: string;
  workshop: string | null;
  hub: string | null;
  availabilityStatus: "AVAILABLE" | "BUSY";
  currentActiveTickets: number;
}

export interface LookupWorkshopStatusDto {
  code: string;
  label: string;
}

export interface LookupVehicleStatusDto {
  code: string;
  label: string;
}
