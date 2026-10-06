import { NotFoundError, UnprocessableEntityError } from "../../errors";
import { DeploymentModuleService } from "../../services/deployment-module.service";

function makeMetadata(overrides: Partial<any> = {}) {
  return {
    deploymentId: "dep-1",
    customerId: "cust-1",
    customerName: "Rider One",
    customerPhone: "9876543210",
    mvTrackNumber: "MV-001",
    vehicleNumber: "WB12AB1234",
    modelCode: "M-1",
    modelName: "Model One",
    hubName: "Kolkata",
    rentalStatus: "ACTIVE",
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T01:00:00.000Z"),
    ...overrides,
  };
}

describe("DeploymentModuleService", () => {
  it("should_return_dashboard", async () => {
    const providers = {
      deploymentProvider: {
        getDeploymentHistory: jest.fn().mockResolvedValue([
          {
            deploymentId: "dep-1",
            customerId: "cust-1",
            vehicleNumber: "WB12AB1234",
            mvTrackNumber: "MV-001",
            rentalStatus: "ACTIVE",
            hubId: "hub-1",
            hubName: "Kolkata",
            modelName: "Model One",
            startedAt: "2026-07-10T00:00:00.000Z",
            updatedAt: "2026-07-10T01:00:00.000Z",
          },
        ]),
      },
      inventoryProvider: {
        getVehicleDetails: jest.fn().mockResolvedValue({ status: "DEPLOYED" }),
      },
      lookupProvider: {
        getWorkshopStatuses: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const repository = {
      listDeploymentMetadata: jest.fn().mockResolvedValue([makeMetadata()]),
      countOpenTickets: jest.fn().mockResolvedValue(0),
    } as any;

    const service = new DeploymentModuleService(providers, repository);
    const result = await service.getDashboard({});

    expect(result.totalDeployments).toBe(1);
    expect(result.activeDeployments).toBe(1);
  });

  it("should_throw_not_found_for_unknown_deployment", async () => {
    const providers = {
      deploymentProvider: { getDeploymentHistory: jest.fn() },
      inventoryProvider: { getVehicleDetails: jest.fn() },
      lookupProvider: { getWorkshopStatuses: jest.fn() },
    } as any;
    const repository = {
      findDeploymentMetadataById: jest.fn().mockResolvedValue(null),
    } as any;
    const service = new DeploymentModuleService(providers, repository);

    await expect(service.getDeploymentById("dep-404")).rejects.toThrow(NotFoundError);
  });

  it("should_block_close_when_open_tickets_exist", async () => {
    const providers = {
      deploymentProvider: {
        getDeploymentHistory: jest.fn().mockResolvedValue([
          {
            deploymentId: "dep-1",
            customerId: "cust-1",
            vehicleNumber: "WB12AB1234",
            mvTrackNumber: "MV-001",
            rentalStatus: "ACTIVE",
            hubId: "hub-1",
            hubName: "Kolkata",
            modelName: "Model One",
            startedAt: "2026-07-10T00:00:00.000Z",
            updatedAt: "2026-07-10T01:00:00.000Z",
          },
        ]),
      },
      inventoryProvider: { getVehicleDetails: jest.fn() },
      lookupProvider: { getWorkshopStatuses: jest.fn() },
    } as any;
    const repository = {
      findDeploymentMetadataById: jest.fn().mockResolvedValue(makeMetadata()),
      countOpenTickets: jest.fn().mockResolvedValue(2),
    } as any;
    const service = new DeploymentModuleService(providers, repository);

    await expect(service.closeDeployment("dep-1")).rejects.toThrow(UnprocessableEntityError);
  });
});
