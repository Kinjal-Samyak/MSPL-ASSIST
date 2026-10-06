import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../errors";
import { TicketWorkflowService } from "../../services/ticket-workflow.service";

function buildRepository(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findWorkflowContext: jest.fn(),
    findJobCardContext: jest.fn(),
    findServiceTlById: jest.fn(),
    findTechnicianById: jest.fn(),
    findClosedStatusId: jest.fn(),
    findOpenStatusId: jest.fn(),
    applyTicketTransition: jest.fn(),
    createJobCard: jest.fn(),
    applyJobCardTransition: jest.fn(),
    findJobCards: jest.fn(),
    findJobCardById: jest.fn(),
    findJobCardDetail: jest.fn(),
    findPartsByIds: jest.fn(),
    saveJobCardDetails: jest.fn(),
    createSparePartRequests: jest.fn(),
    findSparePartRequests: jest.fn().mockResolvedValue([]),
    findSparePartRequestById: jest.fn(),
    decideSparePartRequest: jest.fn(),
    reverseSparePartRequest: jest.fn(),
    returnSparePartsToInventory: jest.fn(),
    closeTicketDecision: jest.fn(),
    createJobCardPdfHistory: jest.fn(),
    findJobCardPdfHistory: jest.fn(),
    findJobCardPdfHistoryContent: jest.fn(),
    // Document 8 - Technician Workspace: default to empty/no-op so tests that don't exercise
    // these features (most of this file) don't have to know about them.
    findUnreconciledSpareParts: jest.fn().mockResolvedValue([]),
    // Amendment 2 - Final Spare Part Billing: default to an empty snapshot so tests that don't
    // exercise the RFD transition don't have to know about billing at all.
    findSparePartsForBilling: jest.fn().mockResolvedValue([]),
    findUserNameById: jest.fn().mockResolvedValue({ id: "user-1", name: "Test User" }),
    findSparePartReturnRequests: jest.fn().mockResolvedValue([]),
    findSparePartReturnRequestById: jest.fn(),
    createSparePartReturnRequest: jest.fn(),
    decideSparePartReturnRequest: jest.fn(),
    recordConsumedQuantity: jest.fn(),
    findJobCardIssueAndReturnTransactions: jest.fn().mockResolvedValue([]),
    findConsumedSpareParts: jest.fn().mockResolvedValue([]),
    findProcurementRequestsForJobCard: jest.fn().mockResolvedValue([]),
    // Document 9, Phase 9.1 - Service Engineer Dashboard.
    findServiceEngineerDashboardTickets: jest.fn().mockResolvedValue([]),
    countPendingSparePartRequests: jest.fn().mockResolvedValue(0),
    countPendingSparePartReturnRequests: jest.fn().mockResolvedValue(0),
    findRecentActivityForTickets: jest.fn().mockResolvedValue([]),
    findTechnicianWorkloadFlags: jest.fn().mockResolvedValue([]),
    countLowStockParts: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as any;
}

function buildJobCardDetailRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "jobcard-1",
    jobCardNumber: "JC-MV-001",
    ticketId: "ticket-1",
    technicianId: "tech-1",
    workflowStage: "IN_PROGRESS",
    initialObservation: null,
    rootCause: null,
    workPerformed: null,
    otherRequirements: null,
    technicianRemarks: null,
    labourCharges: null,
    partsCharges: null,
    otherCharges: null,
    totalCharges: null,
    estimatedCompletionAt: null,
    actualCompletionAt: null,
    completedByName: null,
    closureRemarks: null,
    version: 1,
    lastEditedAt: null,
    partsRequisitionNumber: null,
    partsRequisitionCreatedAt: null,
    partsRequisitionClosedAt: null,
    createdAt: new Date("2026-07-21T00:00:00.000Z"),
    updatedAt: new Date("2026-07-21T00:00:00.000Z"),
    repairStartedAt: null,
    technician: { id: "tech-1", name: "Ravi" },
    spareParts: [],
    ticket: {
      ticketNumber: "MV-001",
      vehicleTypeSnapshot: "High Speed",
      rideabilityStatus: "MOVABLE",
      coordinatorNotes: null,
      assignedAt: null,
      createdAt: new Date("2026-07-20T00:00:00.000Z"),
      serviceTl: { name: "Priya" },
      customer: { name: "Asha", registeredMobile: "9999900000" },
      deployment: { mvTrackNumber: "MV-T-1", hub: { name: "Kolkata" } },
      issueCategory: { name: "Brake" },
      issueItems: [{ issueSubcategory: "Brake Pad" }],
      attachments: [],
    },
    ...overrides,
  } as any;
}

const mockPolicySnapshot = {
  getActivePolicySnapshot: jest.fn().mockResolvedValue({
    priorityDefinitions: [],
    workshopSlaTargets: [],
    stageSlaTargets: [],
    slaStatusRule: { atRiskThresholdPct: 20 },
  }),
} as any;

function buildSparePartRequestRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "request-1",
    jobCardId: "jobcard-1",
    partId: "part-1",
    requestedQuantity: 3,
    status: "PENDING",
    requestedById: "tech-1",
    requestedAt: new Date("2026-07-24T00:00:00.000Z"),
    decidedById: null,
    decidedAt: null,
    decisionRemarks: null,
    approvedQuantity: null,
    reversedById: null,
    reversedAt: null,
    reversalRemarks: null,
    jobCard: { id: "jobcard-1", ticketId: "ticket-1", technicianId: "tech-1", workflowStage: "IN_PROGRESS" },
    part: { id: "part-1", partCode: "BRK001", partName: "Brake Pad", availableQuantity: 10, partCost: { toString: () => "150.00" } },
    requestedBy: { name: "Ravi" },
    decidedBy: null,
    reversedBy: null,
    ...overrides,
  } as any;
}

describe("TicketWorkflowService", () => {
  it("should_assign_service_tl_when_coordinator_reviews_a_created_ticket", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "CREATED",
        serviceTlId: null,
        updatedAt: new Date("2026-07-21T00:00:00.000Z"),
      }),
      findServiceTlById: jest.fn().mockResolvedValue({ id: "stl-1", name: "Priya" }),
      applyTicketTransition: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date("2026-07-21T00:00:00.000Z"),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.assignServiceTl(
      "ticket-1",
      { userId: "coordinator-1", role: "COORDINATOR" },
      { serviceTlId: "stl-1", remarks: "Please review" }
    );

    expect(result.previousStage).toBe("CREATED");
    expect(result.newStage).toBe("SERVICE_TL_REVIEW");
    expect(result.serviceTlId).toBe("stl-1");
    expect(repository.applyTicketTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "ticket-1",
        data: expect.objectContaining({ workflowStage: "SERVICE_TL_REVIEW", serviceTlId: "stl-1" }),
        activity: expect.objectContaining({
          activityType: "WORKFLOW_SERVICE_TL_ASSIGNED",
          performedById: "coordinator-1",
        }),
      })
    );
  });

  it("should_reject_assign_service_tl_when_actor_is_a_technician", async () => {
    const repository = buildRepository();
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.assignServiceTl("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, { serviceTlId: "stl-1" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findWorkflowContext).not.toHaveBeenCalled();
  });

  it("should_assign_service_tl_when_coordinator_reviews_a_reopened_ticket", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "REOPENED",
        serviceTlId: null,
        updatedAt: new Date("2026-07-21T00:00:00.000Z"),
        status: { id: "status-reopened", name: "Reopened" },
      }),
      findServiceTlById: jest.fn().mockResolvedValue({ id: "stl-1", name: "Priya" }),
      applyTicketTransition: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date("2026-07-21T00:00:00.000Z"),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.assignServiceTl(
      "ticket-1",
      { userId: "coordinator-1", role: "COORDINATOR" },
      { serviceTlId: "stl-1" }
    );

    expect(result.previousStage).toBe("REOPENED");
    expect(result.newStage).toBe("SERVICE_TL_REVIEW");
  });

  it("should_reject_assign_service_tl_when_ticket_is_not_in_created_stage", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.assignServiceTl("ticket-1", { userId: "coordinator-1", role: "COORDINATOR" }, { serviceTlId: "stl-2" })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.applyTicketTransition).not.toHaveBeenCalled();
  });

  it("should_reject_transfer_when_actor_is_a_different_service_tl", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.transferServiceTl("ticket-1", { userId: "stl-2", role: "SERVICE_TL" }, { serviceTlId: "stl-3" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.applyTicketTransition).not.toHaveBeenCalled();
  });

  it("should_resolve_consultation_and_close_the_ticket_with_no_job_card", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      findClosedStatusId: jest.fn().mockResolvedValue("status-closed"),
      applyTicketTransition: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "CONSULTATION_RESOLVED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.resolveConsultation(
      "ticket-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      {}
    );

    expect(result.newStage).toBe("CONSULTATION_RESOLVED");
    expect(repository.applyTicketTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workflowStage: "CONSULTATION_RESOLVED", statusId: "status-closed" }),
      })
    );
    expect(repository.createJobCard).not.toHaveBeenCalled();
  });

  it("should_create_a_job_card_when_workshop_is_required", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      findTechnicianById: jest.fn().mockResolvedValue({ id: "tech-1", name: "Ravi" }),
      createJobCard: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.requireWorkshop(
      "ticket-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      { technicianId: "tech-1" }
    );

    expect(result.jobCardId).toBe("jobcard-1");
    expect(result.newStage).toBe("IN_PROGRESS");
    expect(repository.createJobCard).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "ticket-1", technicianId: "tech-1" })
    );
  });

  it("should_reset_status_to_open_when_a_technician_is_assigned_to_a_reopened_ticket", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
        status: { id: "status-reopened", name: "Reopened" },
      }),
      findTechnicianById: jest.fn().mockResolvedValue({ id: "tech-1", name: "Ravi" }),
      findOpenStatusId: jest.fn().mockResolvedValue("status-open"),
      createJobCard: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.requireWorkshop("ticket-1", { userId: "stl-1", role: "SERVICE_TL" }, { technicianId: "tech-1" });

    expect(repository.createJobCard).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "ticket-1", technicianId: "tech-1", resetStatusId: "status-open" })
    );
  });

  it("should_reject_workshop_required_when_actor_is_a_coordinator", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "SERVICE_TL_REVIEW",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.requireWorkshop(
        "ticket-1",
        { userId: "coordinator-1", role: "COORDINATOR" },
        { technicianId: "tech-1" }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.createJobCard).not.toHaveBeenCalled();
  });

  it("should_move_job_card_to_waiting_parts_when_owning_technician_requests_it", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
      applyJobCardTransition: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "WAITING_PARTS",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.waitingForParts("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {});

    expect(result.newStage).toBe("WAITING_PARTS");
  });

  it("should_reject_job_card_transition_when_technician_does_not_own_it", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.waitingForParts("ticket-1", { userId: "tech-2", role: "TECHNICIAN" }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.applyJobCardTransition).not.toHaveBeenCalled();
  });

  it("should_reject_ready_for_deployment_when_job_card_is_waiting_for_parts", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "WAITING_PARTS",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.readyForDeployment("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_reject_any_job_card_transition_once_it_has_reached_rfd", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "RFD",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.waitingForParts("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      service.resume("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      service.readyForDeployment("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.applyJobCardTransition).not.toHaveBeenCalled();
  });

  it("should_let_the_assigned_technician_mark_a_job_card_completed", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
        repairStartedAt: new Date("2026-07-21T00:00:00.000Z"),
      }),
      findTechnicianById: jest.fn().mockResolvedValue({ id: "tech-1", name: "Ravi" }),
      applyJobCardTransition: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.markJobCardCompleted("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {});

    expect(result.newStage).toBe("COMPLETED");
  });

  it("should_auto_capture_completion_date_and_technician_name_on_mark_completed_without_client_input", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
        repairStartedAt: new Date("2026-07-21T00:00:00.000Z"),
      }),
      findTechnicianById: jest.fn().mockResolvedValue({ id: "tech-1", name: "Ravi" }),
      applyJobCardTransition: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.markJobCardCompleted("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {});

    expect(repository.findTechnicianById).toHaveBeenCalledWith("tech-1");
    const [{ data }] = repository.applyJobCardTransition.mock.calls[0];
    expect(data.completedByName).toBe("Ravi");
    expect(data.actualCompletionAt).toBeInstanceOf(Date);
  });

  it("should_reject_mark_completed_from_a_service_tl", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.markJobCardCompleted("ticket-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.applyJobCardTransition).not.toHaveBeenCalled();
  });

  it("should_let_the_assigned_service_tl_complete_final_verification_from_completed_to_rfd", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      applyJobCardTransition: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "RFD",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.readyForDeployment(
      "ticket-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      { actualCompletionAt: "2026-07-22T10:00:00.000Z", completedByName: "Ravi" }
    );

    expect(result.newStage).toBe("RFD");
  });

  it("should_reject_final_verification_from_a_technician", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.readyForDeployment(
        "ticket-1",
        { userId: "tech-1", role: "TECHNICIAN" },
        { actualCompletionAt: "2026-07-22T10:00:00.000Z", completedByName: "Ravi" }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.applyJobCardTransition).not.toHaveBeenCalled();
  });

  it("should_reject_final_verification_missing_completion_date_time_or_technician_name", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.readyForDeployment("ticket-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.applyJobCardTransition).not.toHaveBeenCalled();
  });

  it("should_restrict_a_technicians_job_card_save_to_approved_fields_only", async () => {
    const row = buildJobCardDetailRow({ rootCause: null, workPerformed: null });
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(row),
      saveJobCardDetails: jest.fn().mockResolvedValue(row),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.saveJobCardDetails(
      "ticket-1",
      { userId: "tech-1", role: "TECHNICIAN" },
      { rootCause: "Attempted diagnosis edit", workPerformed: "Replaced brake pad", labourCharges: 500 }
    );

    const [, , updateData] = repository.saveJobCardDetails.mock.calls[0];
    expect(updateData.workPerformed).toBe("Replaced brake pad");
    expect(updateData.rootCause).toBeUndefined();
    expect(updateData.labourCharges).toBeUndefined();
  });

  it("should_allow_admin_to_perform_job_card_transitions_regardless_of_ownership", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
      applyJobCardTransition: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "WAITING_PARTS",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.waitingForParts("ticket-1", { userId: "admin-1", role: "ADMIN" }, {});

    expect(result.newStage).toBe("WAITING_PARTS");
  });

  it("should_throw_not_found_when_ticket_does_not_exist", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue(null),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.assignServiceTl("missing-ticket", { userId: "coordinator-1", role: "COORDINATOR" }, { serviceTlId: "stl-1" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should_scope_job_card_listing_to_the_requesting_technician_only", async () => {
    const repository = buildRepository({
      findJobCards: jest.fn().mockResolvedValue([]),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.listJobCards({ userId: "tech-1", role: "TECHNICIAN" });

    expect(repository.findJobCards).toHaveBeenCalledWith("tech-1");
  });

  it("should_let_admin_list_all_job_cards", async () => {
    const repository = buildRepository({
      findJobCards: jest.fn().mockResolvedValue([]),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.listJobCards({ userId: "admin-1", role: "ADMIN" });

    expect(repository.findJobCards).toHaveBeenCalledWith(undefined);
  });

  it("should_reject_job_card_listing_for_a_coordinator", async () => {
    const repository = buildRepository();
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.listJobCards({ userId: "coordinator-1", role: "COORDINATOR" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_scope_my_tickets_listing_to_the_requesting_service_tl_only", async () => {
    const repository = buildRepository();
    const ticketRepository = {
      findTickets: jest.fn().mockResolvedValue({ items: [], totalRecords: 0 }),
    } as any;
    const service = new TicketWorkflowService({} as any, repository, ticketRepository, mockPolicySnapshot);

    await service.listMyTickets({ userId: "stl-1", role: "SERVICE_TL" }, { page: 1, pageSize: 10 });

    expect(ticketRepository.findTickets).toHaveBeenCalledWith(
      expect.objectContaining({ serviceTlId: "stl-1" })
    );
  });

  it("should_let_admin_list_all_tickets_without_service_tl_scoping", async () => {
    const repository = buildRepository();
    const ticketRepository = {
      findTickets: jest.fn().mockResolvedValue({ items: [], totalRecords: 0 }),
    } as any;
    const service = new TicketWorkflowService({} as any, repository, ticketRepository, mockPolicySnapshot);

    await service.listMyTickets({ userId: "admin-1", role: "ADMIN" }, { page: 1, pageSize: 10 });

    const calledWith = ticketRepository.findTickets.mock.calls[0][0];
    expect(calledWith.serviceTlId).toBeUndefined();
  });

  it("should_reject_my_tickets_listing_for_a_technician", async () => {
    const repository = buildRepository();
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.listMyTickets({ userId: "tech-1", role: "TECHNICIAN" }, { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_reject_viewing_a_ticket_assigned_to_a_different_service_tl", async () => {
    const repository = buildRepository();
    const ticketRepository = {
      findTicketDetailById: jest.fn().mockResolvedValue({
        id: "ticket-1",
        serviceTl: { id: "stl-1", name: "Priya" },
      }),
    } as any;
    const service = new TicketWorkflowService({} as any, repository, ticketRepository, mockPolicySnapshot);

    await expect(
      service.getMyTicket("ticket-1", { userId: "stl-2", role: "SERVICE_TL" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_return_job_card_detail_for_the_assigned_technician", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const detail = await service.getJobCardDetail("ticket-1", { userId: "tech-1", role: "TECHNICIAN" });

    expect(detail.jobCardNumber).toBe("JC-MV-001");
    expect(detail.rider.mvTrackNumber).toBe("MV-T-1");
    expect(detail.complaint.issueSubcategory).toBe("Brake Pad");
    expect(detail.editable).toBe(true);
  });

  it("should_allow_job_card_detail_view_for_a_coordinator", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const detail = await service.getJobCardDetail("ticket-1", { userId: "coordinator-1", role: "COORDINATOR" });

    expect(detail.jobCardNumber).toBe("JC-MV-001");
  });

  it("should_reject_job_card_detail_view_for_an_unrelated_technician", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.getJobCardDetail("ticket-1", { userId: "tech-2", role: "TECHNICIAN" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_mark_job_card_read_only_once_it_has_reached_rfd", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow({ workflowStage: "RFD" })),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const detail = await service.getJobCardDetail("ticket-1", { userId: "admin-1", role: "ADMIN" });

    expect(detail.editable).toBe(false);
  });

  it("should_save_job_card_inspection_details_for_the_assigned_technician", async () => {
    const row = buildJobCardDetailRow();
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(row),
      saveJobCardDetails: jest.fn().mockResolvedValue({ ...row, rootCause: "Worn brake pad", version: 2 }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.saveJobCardDetails(
      "ticket-1",
      { userId: "tech-1", role: "TECHNICIAN" },
      { rootCause: "Worn brake pad" }
    );

    expect(result.rootCause).toBe("Worn brake pad");
    expect(result.version).toBe(2);
    expect(repository.saveJobCardDetails).toHaveBeenCalled();
  });

  it("should_reject_saving_job_card_details_for_an_unrelated_technician", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.saveJobCardDetails("ticket-1", { userId: "tech-2", role: "TECHNICIAN" }, { rootCause: "x" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.saveJobCardDetails).not.toHaveBeenCalled();
  });

  it("should_reject_editing_job_card_details_once_it_has_reached_rfd_for_a_non_admin", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow({ workflowStage: "RFD" })),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.saveJobCardDetails("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, { rootCause: "x" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_allow_admin_to_edit_job_card_details_after_rfd", async () => {
    const row = buildJobCardDetailRow({ workflowStage: "RFD" });
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(row),
      saveJobCardDetails: jest.fn().mockResolvedValue({ ...row, technicianRemarks: "corrected" }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.saveJobCardDetails(
      "ticket-1",
      { userId: "admin-1", role: "ADMIN" },
      { technicianRemarks: "corrected" }
    );

    expect(result.technicianRemarks).toBe("corrected");
  });

  it("should_close_ticket_when_decision_is_yes", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "RFD",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      closeTicketDecision: jest.fn().mockResolvedValue({ closed: true }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.closeTicketDecision(
      "ticket-1",
      { userId: "coordinator-1", role: "COORDINATOR" },
      { decision: "YES" }
    );

    expect(result.closed).toBe(true);
  });

  it("should_reject_closure_decision_for_a_technician", async () => {
    const repository = buildRepository();
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.closeTicketDecision(
        "ticket-1",
        { userId: "tech-1", role: "TECHNICIAN" },
        { decision: "YES" }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_reject_closure_decision_when_ticket_has_not_reached_rfd", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.closeTicketDecision(
        "ticket-1",
        { userId: "coordinator-1", role: "COORDINATOR" },
        { decision: "YES" }
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_auto_calculate_total_charges_from_components_and_ignore_a_client_submitted_total", async () => {
    const row = buildJobCardDetailRow({ labourCharges: null, partsCharges: null, otherCharges: null, totalCharges: null });
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(row),
      saveJobCardDetails: jest.fn().mockResolvedValue(row),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.saveJobCardDetails(
      "ticket-1",
      { userId: "admin-1", role: "ADMIN" },
      { labourCharges: 250, totalCharges: 999999 }
    );

    const [, , updateData] = repository.saveJobCardDetails.mock.calls[0];
    expect(updateData.totalCharges).toBe(250);
  });

  it("should_record_only_the_fields_that_actually_changed_in_the_audit_diff", async () => {
    const row = buildJobCardDetailRow({ rootCause: null });
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(row),
      saveJobCardDetails: jest.fn().mockResolvedValue(row),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await service.saveJobCardDetails(
      "ticket-1",
      { userId: "admin-1", role: "ADMIN" },
      { rootCause: "Worn brake pad" }
    );

    const [, , , activity] = repository.saveJobCardDetails.mock.calls[0];
    expect(activity.metadata.changes).toEqual({
      rootCause: { before: null, after: "Worn brake pad" },
    });
  });

});

describe("TicketWorkflowService - Spare part requests", () => {
  it("should_let_a_technician_submit_a_spare_part_request_for_their_own_job_card", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
      findPartsByIds: jest.fn().mockResolvedValue([{ id: "part-1", partCode: "BRK001", partName: "Brake Pad", availableQuantity: 10 }]),
      createSparePartRequests: jest.fn().mockResolvedValue([buildSparePartRequestRow()]),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.requestSpareParts(
      "ticket-1",
      { userId: "tech-1", role: "TECHNICIAN" },
      { items: [{ partId: "part-1", requestedQuantity: 3 }] }
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("PENDING");
    expect(repository.createSparePartRequests).toHaveBeenCalledWith(
      "jobcard-1",
      "ticket-1",
      "tech-1",
      [{ partId: "part-1", requestedQuantity: 3 }],
      expect.objectContaining({ activityType: "SPARE_PART_REQUEST_SUBMITTED" })
    );
  });

  it("should_reject_a_spare_part_request_from_a_technician_who_does_not_own_the_job_card", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.requestSpareParts(
        "ticket-1",
        { userId: "tech-2", role: "TECHNICIAN" },
        { items: [{ partId: "part-1", requestedQuantity: 3 }] }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.createSparePartRequests).not.toHaveBeenCalled();
  });

  it("should_reject_a_spare_part_request_once_the_job_card_has_reached_rfd_for_a_non_admin", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "RFD",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.requestSpareParts(
        "ticket-1",
        { userId: "tech-1", role: "TECHNICIAN" },
        { items: [{ partId: "part-1", requestedQuantity: 3 }] }
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_approve_a_pending_spare_part_request_and_deduct_inventory", async () => {
    const approvedRow = buildSparePartRequestRow({ status: "APPROVED", decidedById: "stl-1", decidedByName: "Priya" });
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow()),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      decideSparePartRequest: jest.fn().mockResolvedValue({ outcome: "DECIDED", row: approvedRow }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.approveSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, {});

    expect(result.status).toBe("APPROVED");
    expect(repository.decideSparePartRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request-1", decision: "APPROVED", decidedById: "stl-1" })
    );
  });

  it("should_reject_approval_when_stock_is_insufficient", async () => {
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow()),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      decideSparePartRequest: jest.fn().mockResolvedValue({ outcome: "INSUFFICIENT_STOCK", availableQuantity: 1, requestedQuantity: 3 }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.approveSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_require_remarks_to_reject_a_spare_part_request", async () => {
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.rejectSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.decideSparePartRequest).not.toHaveBeenCalled();
  });

  it("should_reject_a_pending_spare_part_request_with_remarks_and_leave_it_visible", async () => {
    const rejectedRow = buildSparePartRequestRow({ status: "REJECTED", decisionRemarks: "Not needed for this repair." });
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow()),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      decideSparePartRequest: jest.fn().mockResolvedValue({ outcome: "DECIDED", row: rejectedRow }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.rejectSparePartRequest(
      "request-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      { remarks: "Not needed for this repair." }
    );

    expect(result.status).toBe("REJECTED");
    expect(result.decisionRemarks).toBe("Not needed for this repair.");
  });

  it("should_reject_deciding_a_request_that_is_no_longer_pending", async () => {
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow({ status: "APPROVED" })),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.approveSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_reject_a_service_tl_deciding_a_request_for_a_ticket_not_assigned_to_them", async () => {
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow()),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-other",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.approveSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.decideSparePartRequest).not.toHaveBeenCalled();
  });

  it("should_reverse_an_approved_spare_part_request_with_remarks", async () => {
    const reversedRow = buildSparePartRequestRow({
      status: "REVERSED",
      reversedById: "stl-1",
      reversalRemarks: "Job card reworked, part no longer needed.",
    });
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow({ status: "APPROVED" })),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      reverseSparePartRequest: jest.fn().mockResolvedValue(reversedRow),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.reverseSparePartRequest(
      "request-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      { remarks: "Job card reworked, part no longer needed." }
    );

    expect(result.status).toBe("REVERSED");
    expect(repository.reverseSparePartRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request-1", reversedById: "stl-1", remarks: "Job card reworked, part no longer needed." })
    );
  });

  it("should_require_remarks_to_reverse_a_spare_part_request", async () => {
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow({ status: "APPROVED" })),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.reverseSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.reverseSparePartRequest).not.toHaveBeenCalled();
  });

  it("should_reject_reversing_a_request_that_is_not_approved", async () => {
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow({ status: "PENDING" })),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.reverseSparePartRequest("request-1", { userId: "stl-1", role: "SERVICE_TL" }, { remarks: "test" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_approve_a_request_at_an_edited_quantity_different_from_what_was_requested", async () => {
    const approvedRow = buildSparePartRequestRow({ status: "APPROVED", approvedQuantity: 2, decidedById: "stl-1" });
    const repository = buildRepository({
      findSparePartRequestById: jest.fn().mockResolvedValue(buildSparePartRequestRow()),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      decideSparePartRequest: jest.fn().mockResolvedValue({ outcome: "DECIDED", row: approvedRow }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.approveSparePartRequest(
      "request-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      { approvedQuantity: 2 }
    );

    expect(result.approvedQuantity).toBe(2);
    expect(repository.decideSparePartRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request-1", decision: "APPROVED", approvedQuantity: 2 })
    );
  });

  it("should_approve_all_pending_requests_on_a_job_card", async () => {
    const requestA = buildSparePartRequestRow({ id: "request-a" });
    const requestB = buildSparePartRequestRow({ id: "request-b", partId: "part-2" });
    const approvedA = buildSparePartRequestRow({ id: "request-a", status: "APPROVED" });
    const approvedB = buildSparePartRequestRow({ id: "request-b", partId: "part-2", status: "APPROVED" });
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
      findSparePartRequests: jest.fn().mockResolvedValue([requestA, requestB]),
      findSparePartRequestById: jest.fn().mockImplementation((id: string) =>
        Promise.resolve(id === "request-a" ? requestA : requestB)
      ),
      decideSparePartRequest: jest
        .fn()
        .mockResolvedValueOnce({ outcome: "DECIDED", row: approvedA })
        .mockResolvedValueOnce({ outcome: "DECIDED", row: approvedB }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.approveAllSparePartRequests("ticket-1", { userId: "stl-1", role: "SERVICE_TL" }, {});

    expect(result.approved).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });

  it("should_skip_and_report_a_request_that_fails_stock_check_during_approve_all_while_approving_the_rest", async () => {
    const requestA = buildSparePartRequestRow({ id: "request-a" });
    const requestB = buildSparePartRequestRow({ id: "request-b", partId: "part-2" });
    const approvedB = buildSparePartRequestRow({ id: "request-b", partId: "part-2", status: "APPROVED" });
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
      findSparePartRequests: jest.fn().mockResolvedValue([requestA, requestB]),
      findSparePartRequestById: jest.fn().mockImplementation((id: string) =>
        Promise.resolve(id === "request-a" ? requestA : requestB)
      ),
      decideSparePartRequest: jest
        .fn()
        .mockResolvedValueOnce({ outcome: "INSUFFICIENT_STOCK", availableQuantity: 0, requestedQuantity: 3 })
        .mockResolvedValueOnce({ outcome: "DECIDED", row: approvedB }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.approveAllSparePartRequests("ticket-1", { userId: "stl-1", role: "SERVICE_TL" }, {});

    expect(result.approved).toHaveLength(1);
    expect(result.approved[0].id).toBe("request-b");
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].requestId).toBe("request-a");
  });

  it("should_reject_approve_all_from_a_service_tl_not_assigned_to_the_ticket", async () => {
    const repository = buildRepository({
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-other",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.approveAllSparePartRequests("ticket-1", { userId: "stl-1", role: "SERVICE_TL" }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findJobCardContext).not.toHaveBeenCalled();
  });

  it("should_return_unused_approved_parts_to_inventory_for_the_assigned_technician", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
      returnSparePartsToInventory: jest.fn().mockResolvedValue({
        outcome: "RETURNED",
        items: [{ partId: "part-1", partCode: "BRK001", returnQuantity: 1 }],
      }),
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.returnSparePartsToInventory(
      "ticket-1",
      { userId: "tech-1", role: "TECHNICIAN" },
      { items: [{ partId: "part-1", returnQuantity: 1 }] }
    );

    expect(result.items).toEqual([{ partId: "part-1", partCode: "BRK001", returnQuantity: 1 }]);
    expect(repository.returnSparePartsToInventory).toHaveBeenCalledWith(
      expect.objectContaining({ jobCardId: "jobcard-1", ticketId: "ticket-1", performedById: "tech-1" })
    );
  });

  it("should_reject_a_technician_returning_parts_for_a_job_card_that_is_not_theirs", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.returnSparePartsToInventory(
        "ticket-1",
        { userId: "tech-2", role: "TECHNICIAN" },
        { items: [{ partId: "part-1", returnQuantity: 1 }] }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.returnSparePartsToInventory).not.toHaveBeenCalled();
  });

  it("should_reject_returning_more_than_the_remaining_returnable_quantity", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
      returnSparePartsToInventory: jest.fn().mockResolvedValue({
        outcome: "INVALID_QUANTITY",
        partId: "part-1",
        partCode: "BRK001",
        remaining: 1,
        requested: 5,
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.returnSparePartsToInventory(
        "ticket-1",
        { userId: "tech-1", role: "TECHNICIAN" },
        { items: [{ partId: "part-1", returnQuantity: 5 }] }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("should_allow_the_service_tl_assigned_to_the_ticket_to_return_parts_to_inventory", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "COMPLETED",
      }),
      findWorkflowContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-001",
        workflowStage: "WORKSHOP_REQUIRED",
        serviceTlId: "stl-1",
        updatedAt: new Date(),
      }),
      returnSparePartsToInventory: jest.fn().mockResolvedValue({
        outcome: "RETURNED",
        items: [{ partId: "part-1", partCode: "BRK001", returnQuantity: 1 }],
      }),
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.returnSparePartsToInventory(
      "ticket-1",
      { userId: "stl-1", role: "SERVICE_TL" },
      { items: [{ partId: "part-1", returnQuantity: 1 }] }
    );

    expect(result.items).toHaveLength(1);
  });
});

describe("TicketWorkflowService - Administrator unlock", () => {
  it("should_reopen_an_rfd_job_card_to_in_progress_for_an_administrator", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "RFD",
      }),
      applyJobCardTransition: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
        updatedAt: new Date(),
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.unlockJobCard("ticket-1", { userId: "admin-1", role: "ADMIN" }, {});

    expect(result.newStage).toBe("IN_PROGRESS");
    expect(repository.applyJobCardTransition).toHaveBeenCalled();
  });

  it("should_reject_unlock_from_anyone_other_than_an_administrator", async () => {
    const repository = buildRepository();
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.unlockJobCard("ticket-1", { userId: "tech-1", role: "TECHNICIAN" }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findJobCardContext).not.toHaveBeenCalled();
  });

  it("should_reject_unlock_when_the_job_card_is_not_currently_at_rfd", async () => {
    const repository = buildRepository({
      findJobCardContext: jest.fn().mockResolvedValue({
        id: "jobcard-1",
        ticketId: "ticket-1",
        technicianId: "tech-1",
        workflowStage: "IN_PROGRESS",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.unlockJobCard("ticket-1", { userId: "admin-1", role: "ADMIN" }, {})
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.applyJobCardTransition).not.toHaveBeenCalled();
  });
});

describe("TicketWorkflowService - Job Card PDF history", () => {
  it("should_let_the_assigned_technician_list_pdf_history_for_their_own_job_card", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
      findJobCardPdfHistory: jest.fn().mockResolvedValue([
        { id: "pdf-1", version: 1, fileName: "JC-MV-001.pdf", generatedAt: new Date(), generatedByName: "Ravi" },
      ]),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.listJobCardPdfHistory("ticket-1", { userId: "tech-1", role: "TECHNICIAN" });

    expect(result).toHaveLength(1);
    expect(repository.findJobCardPdfHistory).toHaveBeenCalledWith("jobcard-1");
  });

  it("should_forbid_an_unrelated_technician_from_listing_pdf_history", async () => {
    const repository = buildRepository({
      findJobCardDetail: jest.fn().mockResolvedValue(buildJobCardDetailRow()),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.listJobCardPdfHistory("ticket-1", { userId: "tech-2", role: "TECHNICIAN" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findJobCardPdfHistory).not.toHaveBeenCalled();
  });

  it("should_return_a_specific_historical_pdfs_content_for_an_administrator", async () => {
    const repository = buildRepository({
      findJobCardPdfHistoryContent: jest.fn().mockResolvedValue({
        fileName: "JC-MV-001.pdf",
        content: Buffer.from("pdf-bytes"),
        ticketId: "ticket-1",
        technicianId: "tech-1",
      }),
    });
    const service = new TicketWorkflowService({} as any, repository);

    const result = await service.getJobCardPdfHistoryContent("pdf-1", { userId: "admin-1", role: "ADMIN" });

    expect(result.fileName).toBe("JC-MV-001.pdf");
  });

  it("should_raise_not_found_for_a_pdf_history_id_that_does_not_exist", async () => {
    const repository = buildRepository({
      findJobCardPdfHistoryContent: jest.fn().mockResolvedValue(null),
    });
    const service = new TicketWorkflowService({} as any, repository);

    await expect(
      service.getJobCardPdfHistoryContent("missing-id", { userId: "admin-1", role: "ADMIN" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("serviceEngineerDashboard", () => {
    const baseTicket = {
      id: "ticket-1",
      ticketNumber: "MV-001",
      workflowStage: "SERVICE_TL_REVIEW" as const,
      assignedToId: null as string | null,
      eta: null as Date | null,
      closedAt: null as Date | null,
      jobCard: null as { id: string; workflowStage: string } | null,
    };

    it("should_reject_a_role_other_than_admin_service_manager_or_service_tl", async () => {
      const repository = buildRepository();
      const service = new TicketWorkflowService({} as any, repository);

      await expect(
        service.serviceEngineerDashboard({ userId: "tech-1", role: "TECHNICIAN" })
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("should_scope_the_ticket_query_to_the_actors_own_tickets_for_a_service_tl", async () => {
      const findServiceEngineerDashboardTickets = jest.fn().mockResolvedValue([]);
      const repository = buildRepository({ findServiceEngineerDashboardTickets });
      const service = new TicketWorkflowService({} as any, repository);

      await service.serviceEngineerDashboard({ userId: "se-1", role: "SERVICE_TL" });

      expect(findServiceEngineerDashboardTickets).toHaveBeenCalledWith("se-1");
    });

    it("should_pass_null_scope_for_admin_and_service_manager_so_they_see_every_ticket", async () => {
      const findServiceEngineerDashboardTickets = jest.fn().mockResolvedValue([]);
      const repository = buildRepository({ findServiceEngineerDashboardTickets });
      const service = new TicketWorkflowService({} as any, repository);

      await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });
      await service.serviceEngineerDashboard({ userId: "sm-1", role: "SERVICE_MANAGER" });

      expect(findServiceEngineerDashboardTickets).toHaveBeenNthCalledWith(1, null);
      expect(findServiceEngineerDashboardTickets).toHaveBeenNthCalledWith(2, null);
    });

    it("should_compute_job_status_counts_assignment_review_and_delivery_tiles_from_ticket_and_job_card_stage", async () => {
      const tickets = [
        { ...baseTicket, id: "t1", workflowStage: "CREATED" as const, assignedToId: null },
        { ...baseTicket, id: "t2", workflowStage: "SERVICE_TL_REVIEW" as const, assignedToId: "tech-1" },
        { ...baseTicket, id: "t3", workflowStage: "WORKSHOP_REQUIRED" as const, assignedToId: "tech-1", jobCard: { id: "jc-3", workflowStage: "COMPLETED" } },
        { ...baseTicket, id: "t4", workflowStage: "RFD" as const, assignedToId: "tech-1", jobCard: { id: "jc-4", workflowStage: "RFD" } },
      ];
      const repository = buildRepository({
        findServiceEngineerDashboardTickets: jest.fn().mockResolvedValue(tickets),
      });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.jobsByStatus).toEqual({ created: 1, review: 1, workshopRequired: 1, rfd: 1 });
      // t1 has no jobCard and is not RFD -> counts toward "awaiting assignment" (no technician).
      expect(result.jobsAwaitingAssignment).toBe(1);
      expect(result.jobsReadyForReview).toBe(1);
      expect(result.jobsReadyForDelivery).toBe(1);
    });

    it("should_flag_a_ticket_as_overdue_only_when_its_eta_has_passed_and_it_is_still_open", async () => {
      const overdue = { ...baseTicket, id: "t1", eta: new Date("2020-01-01T00:00:00.000Z") };
      const notYetDue = { ...baseTicket, id: "t2", eta: new Date("2999-01-01T00:00:00.000Z") };
      const overdueButClosed = { ...baseTicket, id: "t3", eta: new Date("2020-01-01T00:00:00.000Z"), closedAt: new Date() };
      const repository = buildRepository({
        findServiceEngineerDashboardTickets: jest.fn().mockResolvedValue([overdue, notYetDue, overdueButClosed]),
      });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.overdueJobs).toBe(1);
    });

    it("should_mirror_pending_spare_part_requests_into_both_the_parts_approval_and_goods_issue_tiles", async () => {
      const repository = buildRepository({
        findServiceEngineerDashboardTickets: jest.fn().mockResolvedValue([{ ...baseTicket, jobCard: { id: "jc-1", workflowStage: "IN_PROGRESS" } }]),
        countPendingSparePartRequests: jest.fn().mockResolvedValue(3),
        countPendingSparePartReturnRequests: jest.fn().mockResolvedValue(2),
      });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.jobsAwaitingPartsApproval).toBe(3);
      expect(result.jobsAwaitingGoodsIssue).toBe(3);
      expect(result.jobsAwaitingReturnsVerification).toBe(2);
    });

    it("should_compute_technician_availability_and_workshop_utilisation_from_workload_flags", async () => {
      const repository = buildRepository({
        findTechnicianWorkloadFlags: jest.fn().mockResolvedValue([
          { id: "tech-1", busy: true },
          { id: "tech-2", busy: true },
          { id: "tech-3", busy: false },
          { id: "tech-4", busy: false },
        ]),
      });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.technicianAvailability).toEqual({ available: 2, busy: 2, total: 4 });
      expect(result.workshopUtilizationPercent).toBe(50);
    });

    it("should_report_zero_utilisation_when_there_are_no_technicians_at_all", async () => {
      const repository = buildRepository({ findTechnicianWorkloadFlags: jest.fn().mockResolvedValue([]) });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.workshopUtilizationPercent).toBe(0);
    });

    it("should_pass_through_the_low_stock_part_count_as_inventory_alerts", async () => {
      const repository = buildRepository({ countLowStockParts: jest.fn().mockResolvedValue(7) });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.inventoryAlerts).toBe(7);
    });

    it("should_map_recent_activity_rows_into_the_response_shape", async () => {
      const repository = buildRepository({
        findRecentActivityForTickets: jest.fn().mockResolvedValue([
          {
            id: "act-1",
            ticketId: "ticket-1",
            ticketNumber: "MV-001",
            activityType: "SPARE_PART_REQUEST_APPROVED",
            description: "Approved 2 x BRK001.",
            performedAt: new Date("2026-07-29T10:00:00.000Z"),
            performedBy: { name: "Priya" },
          },
        ]),
      });
      const service = new TicketWorkflowService({} as any, repository);

      const result = await service.serviceEngineerDashboard({ userId: "admin-1", role: "ADMIN" });

      expect(result.recentActivity).toEqual([
        {
          id: "act-1",
          ticketId: "ticket-1",
          ticketNumber: "MV-001",
          activityType: "SPARE_PART_REQUEST_APPROVED",
          description: "Approved 2 x BRK001.",
          performedByName: "Priya",
          performedAt: "2026-07-29T10:00:00.000Z",
        },
      ]);
    });
  });
});
