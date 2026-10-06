import { DeploymentProviderRepository } from "../../repositories/deployment-provider.repository";

describe("DeploymentProviderRepository", () => {
  it("should_query_deployments_by_phone", async () => {
    const dataSource = {
      findInventoryByMvTrack: jest.fn(),
      findInventoryByVin: jest.fn(),
      findInventoryByVehicleNumber: jest.fn(),
      findDeploymentsByCustomerId: jest.fn(),
      findDeploymentsByPhone: jest.fn().mockResolvedValue([{ deploymentId: "dep-1" }]),
      findDeploymentsByRiderName: jest.fn(),
    } as any;

    const repository = new DeploymentProviderRepository(dataSource);
    const result = await repository.findDeploymentsByPhone("9876543210");

    expect(dataSource.findDeploymentsByPhone).toHaveBeenCalledWith("9876543210");
    expect(result).toEqual([{ deploymentId: "dep-1" }]);
  });

  it("should_query_deployments_by_customer_id", async () => {
    const dataSource = {
      findInventoryByMvTrack: jest.fn(),
      findInventoryByVin: jest.fn(),
      findInventoryByVehicleNumber: jest.fn(),
      findDeploymentsByCustomerId: jest.fn().mockResolvedValue([{ deploymentId: "dep-2" }]),
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
    } as any;

    const repository = new DeploymentProviderRepository(dataSource);
    const result = await repository.findDeploymentsByCustomerId("cust-1");

    expect(dataSource.findDeploymentsByCustomerId).toHaveBeenCalledWith("cust-1");
    expect(result).toEqual([{ deploymentId: "dep-2" }]);
  });
});

