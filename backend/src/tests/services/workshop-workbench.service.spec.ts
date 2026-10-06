import { WorkshopWorkbenchService } from "../../services/workshop-workbench.service";

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "jobcard-1",
    jobCardNumber: "JC-MV-001",
    workflowStage: "IN_PROGRESS",
    lastEditedAt: null,
    updatedAt: new Date("2026-07-22T00:00:00.000Z"),
    technicianId: "tech-1",
    technician: { name: "Ravi" },
    ticket: {
      id: "ticket-1",
      ticketNumber: "MV-001",
      priority: "MEDIUM",
      workflowStage: "WORKSHOP_REQUIRED",
      status: { name: "Open" },
      customer: { name: "Asha", registeredMobile: "9999900000" },
      deployment: { vehicleNumber: "MTR-1", vehicleModel: { displayName: "M7" }, hub: { name: "Kolkata" } },
    },
    ...overrides,
  };
}

describe("WorkshopWorkbenchService", () => {
  it("should_return_the_summary_counts_from_the_repository_unchanged", async () => {
    const repository = {
      getSummary: jest.fn().mockResolvedValue({
        openJobCards: 5,
        openTickets: 8,
        assignedToTechnician: 2,
        inProgress: 1,
        completed: 1,
        readyForDeployment: 1,
      }),
    } as any;
    const service = new WorkshopWorkbenchService(repository);

    const result = await service.getSummary();

    expect(result.openJobCards).toBe(5);
    expect(result.readyForDeployment).toBe(1);
  });

  it("should_label_an_in_progress_job_card_with_no_edits_yet_as_assigned_to_technician", async () => {
    const repository = {
      list: jest.fn().mockResolvedValue({
        items: [buildRow({ workflowStage: "IN_PROGRESS", lastEditedAt: null })],
        totalRecords: 1,
      }),
    } as any;
    const service = new WorkshopWorkbenchService(repository);

    const result = await service.listJobCards({ page: 1, pageSize: 10 });

    expect(result.items[0].status).toBe("ASSIGNED");
    expect(result.items[0].statusLabel).toBe("Assigned to Technician");
  });

  it("should_label_an_in_progress_job_card_with_saved_edits_as_in_progress", async () => {
    const repository = {
      list: jest.fn().mockResolvedValue({
        items: [buildRow({ workflowStage: "IN_PROGRESS", lastEditedAt: new Date() })],
        totalRecords: 1,
      }),
    } as any;
    const service = new WorkshopWorkbenchService(repository);

    const result = await service.listJobCards({ page: 1, pageSize: 10 });

    expect(result.items[0].status).toBe("IN_PROGRESS");
    expect(result.items[0].statusLabel).toBe("In Progress");
  });

  it("should_pass_through_completed_and_rfd_stages_unchanged", async () => {
    const repository = {
      list: jest.fn().mockResolvedValue({
        items: [buildRow({ workflowStage: "COMPLETED" }), buildRow({ id: "jobcard-2", workflowStage: "RFD" })],
        totalRecords: 2,
      }),
    } as any;
    const service = new WorkshopWorkbenchService(repository);

    const result = await service.listJobCards({ page: 1, pageSize: 10 });

    expect(result.items[0].statusLabel).toBe("Pending Service Engineer Verification");
    expect(result.items[1].statusLabel).toBe("Ready for Deployment");
  });

  it("should_combine_vehicle_model_and_number_when_a_deployment_exists", async () => {
    const repository = {
      list: jest.fn().mockResolvedValue({ items: [buildRow()], totalRecords: 1 }),
    } as any;
    const service = new WorkshopWorkbenchService(repository);

    const result = await service.listJobCards({ page: 1, pageSize: 10 });

    expect(result.items[0].vehicle).toBe("M7 · MTR-1");
    expect(result.items[0].hub).toBe("Kolkata");
  });

  it("should_reject_an_invalid_status_filter_value", async () => {
    const repository = { list: jest.fn() } as any;
    const service = new WorkshopWorkbenchService(repository);

    await expect(
      service.listJobCards({ page: 1, pageSize: 10, status: "NOT_A_REAL_STATUS" })
    ).rejects.toThrow();
    expect(repository.list).not.toHaveBeenCalled();
  });
});
