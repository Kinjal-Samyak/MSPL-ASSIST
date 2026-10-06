import type {
  AssignedVehicleDto,
  CurrentHubDto,
  DeploymentDetailsDto,
  InventoryHubDto,
  InventoryIotDetailsDto,
  InventoryModelDto,
  InventoryVehicleDetailsDto,
  InventoryVehicleStatusDto,
  LookupHubDto,
  LookupIssueCategoryDto,
  LookupIssueSubCategoryDto,
  LookupModelCodeDto,
  LookupPlanDto,
  LookupTechnicianDto,
  LookupVehicleModelDto,
  LookupVehicleStatusDto,
  LookupWorkshopStatusDto,
  RiderProfileDto,
} from "../dto/operational-provider.dto";

export interface InventoryProvider {
  findVehicle(mvTrackNumber: unknown): Promise<InventoryVehicleDetailsDto | null>;
  findVehicleByMvTrack(mvTrackNumber: unknown): Promise<InventoryVehicleDetailsDto | null>;
  findVehicleByVehicleNumber(vehicleNumber: unknown): Promise<InventoryVehicleDetailsDto | null>;
  findVehicleByVin(vin: unknown): Promise<InventoryVehicleDetailsDto | null>;
  listVehicles(): Promise<InventoryVehicleDetailsDto[]>;
  getVehicleDetails(mvTrackNumber: unknown): Promise<InventoryVehicleDetailsDto | null>;
  getVehicleStatus(mvTrackNumber: unknown): Promise<InventoryVehicleStatusDto | null>;
  getHub(mvTrackNumber: unknown): Promise<InventoryHubDto | null>;
  getModel(mvTrackNumber: unknown): Promise<InventoryModelDto | null>;
  getIotDetails(mvTrackNumber: unknown): Promise<InventoryIotDetailsDto | null>;
}

export interface DeploymentProvider {
  findRiderByPhone(phone: unknown): Promise<RiderProfileDto | null>;
  findRiderByName(name: unknown): Promise<RiderProfileDto | null>;
  getActiveDeployment(customerId: unknown): Promise<DeploymentDetailsDto | null>;
  getLatestDeployment(customerId: unknown): Promise<DeploymentDetailsDto | null>;
  getDeploymentHistory(customerId: unknown): Promise<DeploymentDetailsDto[]>;
  getCurrentDeploymentByVehicle(mvTrackNumber: unknown): Promise<DeploymentDetailsDto | null>;
  getDeploymentHistoryByVehicle(mvTrackNumber: unknown): Promise<DeploymentDetailsDto[]>;
  getAssignedVehicle(customerId: unknown): Promise<AssignedVehicleDto | null>;
  getCurrentHub(customerId: unknown): Promise<CurrentHubDto | null>;
}

export interface LookupProvider {
  getHubs(): Promise<LookupHubDto[]>;
  getVehicleModels(): Promise<LookupVehicleModelDto[]>;
  getModelCodes(): Promise<LookupModelCodeDto[]>;
  getPlans(): Promise<LookupPlanDto[]>;
  getIssueCategories(): Promise<LookupIssueCategoryDto[]>;
  getIssueSubCategories(issueCategoryId?: unknown): Promise<LookupIssueSubCategoryDto[]>;
  getTechnicians(filters?: unknown): Promise<LookupTechnicianDto[]>;
  getWorkshopStatuses(): Promise<LookupWorkshopStatusDto[]>;
  getVehicleStatuses(): Promise<LookupVehicleStatusDto[]>;
}
