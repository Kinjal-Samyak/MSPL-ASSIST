import { MasterService } from "../../services/master.service";

describe("MasterService", () => {
  it("should_delegate_get_statuses_to_repository", async () => {
    const repository = {
      getStatuses: jest.fn().mockResolvedValue([{ id: "status-1", name: "Open" }]),
      getIssueCategories: jest.fn(),
      getHubs: jest.fn(),
      getVehicleModels: jest.fn(),
    } as any;
    const service = new MasterService(repository);

    const result = await service.getStatuses();

    expect(repository.getStatuses).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: "status-1", name: "Open" }]);
  });

  it("should_delegate_get_issue_categories_to_repository", async () => {
    const repository = {
      getStatuses: jest.fn(),
      getIssueCategories: jest.fn().mockResolvedValue([{ id: "issue-1", name: "Battery" }]),
      getHubs: jest.fn(),
      getVehicleModels: jest.fn(),
    } as any;
    const service = new MasterService(repository);

    await service.getIssueCategories();

    expect(repository.getIssueCategories).toHaveBeenCalledTimes(1);
  });
});
