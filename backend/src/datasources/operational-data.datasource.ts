import type {
  DeploymentSourceRecordDto,
  InventorySourceRecordDto,
  LookupHubSourceRecordDto,
  LookupIssueCategorySourceRecordDto,
  LookupPlanSourceRecordDto,
  LookupStatusSourceRecordDto,
  LookupTechnicianSourceRecordDto,
  LookupVehicleModelSourceRecordDto,
} from "../dto/operational-provider.dto";

export interface OperationalDataSource {
  listInventoryRecords(): Promise<InventorySourceRecordDto[]>;
  findInventoryByMvTrack(mvTrackNumber: string): Promise<InventorySourceRecordDto[]>;
  findInventoryByVin(vin: string): Promise<InventorySourceRecordDto[]>;
  findInventoryByVehicleNumber(vehicleNumber: string): Promise<InventorySourceRecordDto[]>;
  findDeploymentsByCustomerId(customerId: string): Promise<DeploymentSourceRecordDto[]>;
  findDeploymentsByMvTrack(mvTrackNumber: string): Promise<DeploymentSourceRecordDto[]>;
  findDeploymentsByPhone(phone: string): Promise<DeploymentSourceRecordDto[]>;
  findDeploymentsByRiderName(name: string): Promise<DeploymentSourceRecordDto[]>;
  getLookupHubs(): Promise<LookupHubSourceRecordDto[]>;
  getLookupVehicleModels(): Promise<LookupVehicleModelSourceRecordDto[]>;
  getLookupPlans(): Promise<LookupPlanSourceRecordDto[]>;
  getLookupIssueCategories(issueCategoryId?: string): Promise<LookupIssueCategorySourceRecordDto[]>;
  getLookupTechnicians(hub?: string): Promise<LookupTechnicianSourceRecordDto[]>;
  getLookupWorkshopStatuses(): Promise<LookupStatusSourceRecordDto[]>;
  getLookupVehicleStatuses(): Promise<LookupStatusSourceRecordDto[]>;
}
