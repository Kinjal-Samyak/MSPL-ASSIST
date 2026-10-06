import { NotFoundError, UnprocessableEntityError } from "../../errors";
import { WorkshopService } from "../../services/workshop.service";

function makeJob(overrides: Partial<any> = {}) {
  return {
    id: "job-1",
    ticketNumber: "MV-010126-001",
    status: "Open",
    priority: "MEDIUM",
    customerId: "cust-1",
    customerName: "Rider One",
    customerPhone: "9876543210",
    deploymentId: "dep-1",
    mvTrackNumber: "MV-001",
    vehicleNumber: "WB12AB1234",
    hubName: "Kolkata",
    technicianId: null,
    technicianName: null,
    issueCategory: "Battery",
    issueDescription: "Issue",
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T01:00:00.000Z"),
    eta: null,
    coordinatorNotes: null,
    estimatedCharges: null,
    finalCharges: null,
    ...overrides,
  };
}

describe("WorkshopService", () => {
  it("should_return_dashboard", async () => {
    const providers = {
      inventoryProvider: { getVehicleDetails: jest.fn() },
      deploymentProvider: { getDeploymentHistory: jest.fn() },
      lookupProvider: { getTechnicians: jest.fn() },
    } as any;
    const repository = {
      countJobs: jest.fn().mockResolvedValue(6),
      countJobsByStatus: jest
        .fn()
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1),
    } as any;
    const service = new WorkshopService(providers, repository);

    const result = await service.getDashboard();
    expect(result.totalJobs).toBe(6);
    expect(result.openJobs).toBe(2);
  });

  it("should_throw_not_found_for_unknown_job", async () => {
    const providers = {
      inventoryProvider: { getVehicleDetails: jest.fn() },
      deploymentProvider: { getDeploymentHistory: jest.fn() },
      lookupProvider: { getTechnicians: jest.fn() },
    } as any;
    const repository = { findJobById: jest.fn().mockResolvedValue(null) } as any;
    const service = new WorkshopService(providers, repository);

    await expect(service.getJobById("job-404")).rejects.toThrow(NotFoundError);
  });

  it("should_block_start_for_cancelled_job", async () => {
    const providers = {
      inventoryProvider: { getVehicleDetails: jest.fn() },
      deploymentProvider: { getDeploymentHistory: jest.fn() },
      lookupProvider: { getTechnicians: jest.fn() },
    } as any;
    const repository = {
      findJobById: jest.fn().mockResolvedValue(makeJob({ status: "Cancelled" })),
    } as any;
    const service = new WorkshopService(providers, repository);

    await expect(service.startJob("job-1")).rejects.toThrow(UnprocessableEntityError);
  });

  it("should_append_a_new_issue_to_the_existing_active_workshop_ticket", async () => {
    const activeJob = makeJob({ status: "Open" });
    const providers = {
      inventoryProvider: { getVehicleDetails: jest.fn() },
      deploymentProvider: { getDeploymentHistory: jest.fn().mockResolvedValue([{ deploymentId: "dep-1" }]) },
      lookupProvider: { getTechnicians: jest.fn() },
    } as any;
    const repository = {
      findDeploymentById: jest.fn().mockResolvedValue({ id: "dep-1", customerId: "cust-1" }),
      findIssueCategoryById: jest.fn().mockResolvedValue({ id: "issue-2", name: "Tyre" }),
      findStatusIdByName: jest.fn().mockResolvedValue("status-open"),
      findActiveWorkshopJobByDeployment: jest.fn().mockResolvedValue(activeJob),
      appendIssueCategory: jest.fn(),
      addActivity: jest.fn(),
    } as any;
    const service = new WorkshopService(providers, repository);

    const result = await service.createJob({
      deploymentId: "dep-1", issueCategoryId: "issue-2", issueDescription: "Tyre puncture", priority: "MEDIUM",
    });

    expect(result.jobId).toBe(activeJob.id);
    expect(repository.appendIssueCategory).toHaveBeenCalledWith(activeJob.id, "issue-2", "Tyre puncture");
    expect(repository.addActivity).toHaveBeenCalledWith(activeJob.id, "WORKSHOP_ISSUE_APPENDED", expect.any(String));
  });

  it("should_lock_issue_append_when_work_in_progress_has_started", async () => {
    const providers = {
      inventoryProvider: { getVehicleDetails: jest.fn() },
      deploymentProvider: { getDeploymentHistory: jest.fn().mockResolvedValue([{ deploymentId: "dep-1" }]) },
      lookupProvider: { getTechnicians: jest.fn() },
    } as any;
    const repository = {
      findDeploymentById: jest.fn().mockResolvedValue({ id: "dep-1", customerId: "cust-1" }),
      findIssueCategoryById: jest.fn().mockResolvedValue({ id: "issue-2", name: "Tyre" }),
      findStatusIdByName: jest.fn().mockResolvedValue("status-open"),
      findActiveWorkshopJobByDeployment: jest.fn().mockResolvedValue(makeJob({ status: "In Progress" })),
    } as any;
    const service = new WorkshopService(providers, repository);

    await expect(service.createJob({
      deploymentId: "dep-1", issueCategoryId: "issue-2", issueDescription: "Tyre puncture", priority: "MEDIUM",
    })).rejects.toThrow(UnprocessableEntityError);
  });
});
