import type { DeploymentSourceRecordDto, InventorySourceRecordDto } from "../../dto/operational-provider.dto";
import type { OperationalDataSource } from "../../datasources/operational-data.datasource";
import { DeploymentProviderRepository } from "../../repositories/deployment-provider.repository";
import { InventoryProviderRepository } from "../../repositories/inventory-provider.repository";
import { DeploymentProviderService } from "../../services/deployment-provider.service";
import { InventoryProviderService } from "../../services/inventory-provider.service";

class InMemoryOperationalDataSource implements OperationalDataSource {
  constructor(
    private readonly inventoryRows: InventorySourceRecordDto[],
    private readonly deploymentRows: DeploymentSourceRecordDto[]
  ) {}

  async findInventoryByMvTrack(mvTrackNumber: string): Promise<InventorySourceRecordDto[]> {
    return this.inventoryRows.filter((row) => row.mvTrackNumber === mvTrackNumber);
  }

  async listInventoryRecords(): Promise<InventorySourceRecordDto[]> {
    return this.inventoryRows;
  }

  async findInventoryByVin(vin: string): Promise<InventorySourceRecordDto[]> {
    return this.inventoryRows.filter((row) => row.vin === vin);
  }

  async findInventoryByVehicleNumber(vehicleNumber: string): Promise<InventorySourceRecordDto[]> {
    return this.inventoryRows.filter((row) => row.vehicleNumber === vehicleNumber);
  }

  async findDeploymentsByCustomerId(customerId: string): Promise<DeploymentSourceRecordDto[]> {
    return this.deploymentRows.filter((row) => row.customerId === customerId);
  }

  async findDeploymentsByMvTrack(mvTrackNumber: string): Promise<DeploymentSourceRecordDto[]> {
    return this.deploymentRows.filter((row) => row.mvTrackNumber === mvTrackNumber);
  }

  async findDeploymentsByPhone(phone: string): Promise<DeploymentSourceRecordDto[]> {
    return this.deploymentRows.filter((row) => row.customerPhone === phone);
  }

  async findDeploymentsByRiderName(name: string): Promise<DeploymentSourceRecordDto[]> {
    return this.deploymentRows.filter((row) => row.customerName.includes(name));
  }

  async getLookupHubs() {
    return [];
  }

  async getLookupVehicleModels() {
    return [];
  }

  async getLookupPlans() {
    return [];
  }

  async getLookupIssueCategories() {
    return [];
  }

  async getLookupTechnicians() {
    return [];
  }

  async getLookupWorkshopStatuses() {
    return [];
  }

  async getLookupVehicleStatuses() {
    return [];
  }
}

describe("Integration - Operational Providers", () => {
  const inventoryRows: InventorySourceRecordDto[] = [
    {
      sourceId: "dep-1",
      mvTrackNumber: "MV-101",
      vehicleNumber: "WB12AB1010",
      registrationNumber: null,
      vin: "VIN-101",
      chassisNumber: null,
      motorNumber: null,
      batteryNumber: "BAT-101",
      modelCode: "MODEL-101",
      modelName: "Model 101",
      color: null,
      variant: null,
      manufacturer: "MV",
      hubId: "hub-1",
      hubName: "Kolkata",
      iotImei: null,
      iotSimNumber: null,
      ownership: null,
      purchaseDate: null,
      assetCost: null,
      warrantyExpiryDate: null,
      registrationExpiryDate: null,
      insuranceExpiryDate: null,
      fitnessExpiryDate: null,
      pucExpiryDate: null,
      fdd: null,
      currentCustomerId: "cust-1",
      currentCustomerName: "Rider One",
      currentCustomerPhone: "9876543210",
      rentalStatus: "ACTIVE",
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
  ];

  const deploymentRows: DeploymentSourceRecordDto[] = [
    {
      deploymentId: "dep-2",
      customerId: "cust-1",
      customerName: "Rider One",
      customerPhone: "9876543210",
      vehicleNumber: "WB12AB2020",
      mvTrackNumber: "MV-202",
      rentalStatus: "ACTIVE",
      hubId: "hub-1",
      hubName: "Kolkata",
      modelName: "Model 202",
      startedAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    },
    {
      deploymentId: "dep-1",
      customerId: "cust-1",
      customerName: "Rider One",
      customerPhone: "9876543210",
      vehicleNumber: "WB12AB1010",
      mvTrackNumber: "MV-101",
      rentalStatus: "COMPLETED",
      hubId: "hub-2",
      hubName: "Howrah",
      modelName: "Model 101",
      startedAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
  ];

  it("should_resolve_inventory_and_deployment_provider_flows", async () => {
    const dataSource = new InMemoryOperationalDataSource(inventoryRows, deploymentRows);
    const inventoryRepository = new InventoryProviderRepository(dataSource);
    const deploymentRepository = new DeploymentProviderRepository(dataSource);
    const inventoryService = new InventoryProviderService(inventoryRepository);
    const deploymentService = new DeploymentProviderService(deploymentRepository);

    const inventoryVehicle = await inventoryService.findVehicle("MV-101");
    const assignedVehicle = await deploymentService.getAssignedVehicle("cust-1");
    const activeDeployment = await deploymentService.getActiveDeployment("cust-1");

    expect(inventoryVehicle).toMatchObject({
      mvTrackNumber: "MV-101",
      vehicleNumber: "WB12AB1010",
      status: "DEPLOYED",
    });
    expect(assignedVehicle).toEqual({
      vehicleNumber: "WB12AB2020",
      mvTrackNumber: "MV-202",
      modelName: "Model 202",
    });
    expect(activeDeployment).toMatchObject({
      deploymentId: "dep-2",
      rentalStatus: "ACTIVE",
    });
  });
});
