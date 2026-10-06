import { DeploymentProviderService } from "../../services/deployment-provider.service";

describe("DeploymentProviderService", () => {
  it("should_select_latest_active_deployment_for_assigned_vehicle", async () => {
    const repository = {
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
      findDeploymentsByCustomerId: jest.fn().mockResolvedValue([
        {
          deploymentId: "dep-2",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          vehicleNumber: "WB12AB2222",
          mvTrackNumber: "MV-222",
          rentalStatus: "ACTIVE",
          hubId: "hub-1",
          hubName: "Kolkata",
          modelName: "Model X",
          startedAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z",
        },
        {
          deploymentId: "dep-1",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          vehicleNumber: "WB12AB1111",
          mvTrackNumber: "MV-111",
          rentalStatus: "COMPLETED",
          hubId: "hub-1",
          hubName: "Kolkata",
          modelName: "Model Y",
          startedAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
        },
      ]),
    } as any;

    const service = new DeploymentProviderService(repository);
    const result = await service.getAssignedVehicle("cust-1");

    expect(result).toEqual({
      vehicleNumber: "WB12AB2222",
      mvTrackNumber: "MV-222",
      modelName: "Model X",
    });
  });

  it("should_fallback_to_latest_deployment_when_no_active_exists", async () => {
    const repository = {
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
      findDeploymentsByCustomerId: jest.fn().mockResolvedValue([
        {
          deploymentId: "dep-3",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          vehicleNumber: "WB12AB3333",
          mvTrackNumber: "MV-333",
          rentalStatus: "COMPLETED",
          hubId: "hub-1",
          hubName: "Kolkata",
          modelName: "Model Z",
          startedAt: "2026-07-13T00:00:00.000Z",
          updatedAt: "2026-07-13T00:00:00.000Z",
        },
      ]),
    } as any;

    const service = new DeploymentProviderService(repository);
    const result = await service.getCurrentHub("cust-1");

    expect(result).toEqual({
      hubId: "hub-1",
      hubName: "Kolkata",
    });
  });

  it("should_find_rider_by_phone", async () => {
    const repository = {
      findDeploymentsByPhone: jest.fn().mockResolvedValue([
        {
          deploymentId: "dep-2",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          vehicleNumber: "WB12AB2222",
          mvTrackNumber: "MV-222",
          rentalStatus: "ACTIVE",
          hubId: "hub-1",
          hubName: "Kolkata",
          modelName: "Model X",
          startedAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z",
        },
      ]),
      findDeploymentsByRiderName: jest.fn(),
      findDeploymentsByCustomerId: jest.fn(),
    } as any;

    const service = new DeploymentProviderService(repository);
    const rider = await service.findRiderByPhone("9876543210");

    expect(rider).toEqual({
      customerId: "cust-1",
      customerName: "Rider One",
      customerPhone: "9876543210",
    });
  });

  it("should_return_latest_when_active_missing_for_get_active_deployment", async () => {
    const repository = {
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
      findDeploymentsByCustomerId: jest.fn().mockResolvedValue([
        {
          deploymentId: "dep-4",
          customerId: "cust-1",
          customerName: "Rider One",
          customerPhone: "9876543210",
          vehicleNumber: "WB12AB4444",
          mvTrackNumber: "MV-444",
          rentalStatus: "COMPLETED",
          hubId: "hub-1",
          hubName: "Kolkata",
          modelName: "Model A",
          startedAt: "2026-07-14T00:00:00.000Z",
          updatedAt: "2026-07-14T00:00:00.000Z",
        },
      ]),
    } as any;

    const service = new DeploymentProviderService(repository);
    const deployment = await service.getActiveDeployment("cust-1");

    expect(deployment).toMatchObject({
      deploymentId: "dep-4",
      rentalStatus: "COMPLETED",
    });
  });
});
