import { ApplicationError } from "../../errors";
import { DeploymentService } from "../../services/deployment.service";
import { logger } from "../../utils/logger";

describe("DeploymentService", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_return_verified_deployment_when_provider_finds_active_deployment", async () => {
    const providers = {
      deploymentProvider: {
        getActiveDeployment: jest.fn().mockResolvedValue({
          deploymentId: "dep-1",
          customerId: "cust-1",
          vehicleNumber: "WB12AB1234",
          mvTrackNumber: "MV-001",
          rentalStatus: "ACTIVE",
          hubId: "hub-1",
          hubName: "Kolkata Hub",
          modelName: "M7",
          startedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        }),
      },
    } as any;
    const service = new DeploymentService(providers);

    const result = await service.getActiveDeployment("cust-1");

    expect(result).toMatchObject({
      deploymentId: "dep-1",
      vehicleNumber: "WB12AB1234",
      vehicleModel: "M7",
      hubName: "Kolkata Hub",
    });
  });

  it("should_return_null_when_no_active_deployment_found", async () => {
    const providers = { deploymentProvider: { getActiveDeployment: jest.fn().mockResolvedValue(null) } } as any;
    const service = new DeploymentService(providers);

    await expect(service.getActiveDeployment("cust-1")).resolves.toBeNull();
  });

  it("should_throw_application_error_when_customer_id_is_invalid", async () => {
    const service = new DeploymentService({ deploymentProvider: { getActiveDeployment: jest.fn() } } as any);

    await expect(service.getActiveDeployment("")).rejects.toThrow(ApplicationError);
  });
});
