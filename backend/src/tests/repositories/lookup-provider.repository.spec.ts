import { LookupProviderRepository } from "../../repositories/lookup-provider.repository";

describe("LookupProviderRepository", () => {
  it("should_get_hubs", async () => {
    const dataSource = {
      getLookupHubs: jest.fn().mockResolvedValue([{ id: "hub-1", name: "Kolkata", city: "Kolkata", state: "WB" }]),
      getLookupVehicleModels: jest.fn(),
      getLookupPlans: jest.fn(),
      getLookupIssueCategories: jest.fn(),
      getLookupTechnicians: jest.fn(),
      getLookupWorkshopStatuses: jest.fn(),
      getLookupVehicleStatuses: jest.fn(),
      findInventoryByMvTrack: jest.fn(),
      findInventoryByVin: jest.fn(),
      findInventoryByVehicleNumber: jest.fn(),
      findDeploymentsByCustomerId: jest.fn(),
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
    } as any;

    const repository = new LookupProviderRepository(dataSource);
    const hubs = await repository.getHubs();

    expect(dataSource.getLookupHubs).toHaveBeenCalledTimes(1);
    expect(hubs[0]).toMatchObject({ id: "hub-1", name: "Kolkata" });
  });

  it("should_get_issue_categories_by_optional_id", async () => {
    const dataSource = {
      getLookupHubs: jest.fn(),
      getLookupVehicleModels: jest.fn(),
      getLookupPlans: jest.fn(),
      getLookupIssueCategories: jest.fn().mockResolvedValue([]),
      getLookupTechnicians: jest.fn(),
      getLookupWorkshopStatuses: jest.fn(),
      getLookupVehicleStatuses: jest.fn(),
      findInventoryByMvTrack: jest.fn(),
      findInventoryByVin: jest.fn(),
      findInventoryByVehicleNumber: jest.fn(),
      findDeploymentsByCustomerId: jest.fn(),
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
    } as any;

    const repository = new LookupProviderRepository(dataSource);
    await repository.getIssueCategories("issue-1");

    expect(dataSource.getLookupIssueCategories).toHaveBeenCalledWith("issue-1");
  });
});

