import { ConflictError, NotFoundError } from "../../errors";
import { TicketService } from "../../services/ticket.service";
import { logger } from "../../utils/logger";
import * as validatorModule from "../../validators/ticket.validator";

const mockPolicySnapshot = {
  getActivePolicySnapshot: jest.fn().mockResolvedValue({
    priorityDefinitions: [],
    workshopSlaTargets: [],
    stageSlaTargets: [],
    slaStatusRule: { atRiskThresholdPct: 20 },
  }),
} as any;

describe("TicketService", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_return_existing_ticket_response_when_customer_has_active_ticket", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {
      findCustomerByRegisteredMobile: jest.fn().mockResolvedValue({ id: "cust-1" }),
      findIssueCategoryById: jest.fn(),
      findStatusByName: jest.fn(),
      findDeploymentForCustomer: jest.fn(),
    } as any;
    const ticketRepository = {
      findActiveTicketForCustomer: jest.fn().mockResolvedValue({
        id: "ticket-1",
        ticketNumber: "MV-090726-001",
        status: { id: "status-1", name: "Open" },
      }),
      createTicketWithHistoryAndActivity: jest.fn(),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    jest.spyOn(validatorModule, "validateCreateTicketDto").mockReturnValue({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake issue description",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: false,
    } as any);

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    const result = await service.createTicket({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake issue description",
    });

    expect(result).toEqual({
      existingTicket: true,
      ticketNumber: "MV-090726-001",
      currentStatus: "Open",
    });
    expect(ticketRepository.createTicketWithHistoryAndActivity).not.toHaveBeenCalled();
  });

  it("should_throw_not_found_error_when_customer_does_not_exist", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {
      findCustomerByRegisteredMobile: jest.fn().mockResolvedValue(null),
      findIssueCategoryById: jest.fn(),
      findStatusByName: jest.fn(),
      findDeploymentForCustomer: jest.fn(),
    } as any;
    const ticketRepository = {
      findActiveTicketForCustomer: jest.fn(),
      createTicketWithHistoryAndActivity: jest.fn(),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    jest.spyOn(validatorModule, "validateCreateTicketDto").mockReturnValue({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake issue description",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: false,
    } as any);

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    await expect(
      service.createTicket({
        registeredMobile: "9999988877",
        issueCategoryId: "issue-1",
        issueDescription: "Brake issue description",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("should_create_new_ticket_when_no_active_ticket_exists", async () => {
    const createdTicket = {
      id: "ticket-2",
      ticketNumber: "MV-090726-010",
      createdAt: new Date("2026-07-09T10:00:00.000Z"),
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({})),
    } as any;
    const masterRepository = {
      findCustomerByRegisteredMobile: jest.fn().mockResolvedValue({ id: "cust-1" }),
      findIssueCategoryById: jest.fn().mockResolvedValue({ id: "issue-1" }),
      findStatusByName: jest.fn().mockResolvedValue({ id: "status-open" }),
      findDeploymentForCustomer: jest.fn().mockResolvedValue({ id: "dep-1" }),
    } as any;
    const ticketRepository = {
      findActiveTicketForCustomer: jest.fn().mockResolvedValue(null),
      createTicketWithHistoryAndActivity: jest.fn().mockResolvedValue(createdTicket),
    } as any;
    const ticketNumberService = {
      generateNextTicketNumber: jest.fn().mockResolvedValue({ ticketNumber: "MV-090726-010" }),
    } as any;
    jest.spyOn(validatorModule, "validateCreateTicketDto").mockReturnValue({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake issue description",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: true,
    } as any);

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    const result = await service.createTicket({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake issue description",
    });

    expect(result).toEqual({
      existingTicket: false,
      ticketId: "ticket-2",
      ticketNumber: "MV-090726-010",
      createdAt: "2026-07-09T10:00:00.000Z",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("should_throw_not_found_error_when_issue_category_is_missing", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {
      findCustomerByRegisteredMobile: jest.fn().mockResolvedValue({ id: "cust-1" }),
      findIssueCategoryById: jest.fn().mockResolvedValue(null),
      findStatusByName: jest.fn(),
      findDeploymentForCustomer: jest.fn(),
    } as any;
    const ticketRepository = {
      findActiveTicketForCustomer: jest.fn().mockResolvedValue(null),
      createTicketWithHistoryAndActivity: jest.fn(),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    jest.spyOn(validatorModule, "validateCreateTicketDto").mockReturnValue({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake issue description",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: false,
    } as any);

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    await expect(
      service.createTicket({
        registeredMobile: "9999988877",
        issueCategoryId: "issue-1",
        issueDescription: "Brake issue description",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("should_return_paginated_ticket_list", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {} as any;
    const ticketRepository = {
      findTickets: jest.fn().mockResolvedValue({
        items: [
          {
            id: "ticket-1",
            ticketNumber: "MV-090726-001",
            priority: "MEDIUM",
            createdAt: new Date("2026-07-09T10:00:00.000Z"),
            eta: null,
            status: { name: "Open" },
            customer: { name: "Customer One", registeredMobile: "9999988877" },
            issueCategory: { name: "Battery" },
            assignedTo: null,
            deployment: null,
          },
        ],
        totalRecords: 1,
      }),
      findTicketDetailById: jest.fn(),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService, mockPolicySnapshot);
    const response = await service.getTickets({});

    expect(ticketRepository.findTickets).toHaveBeenCalledTimes(1);
    expect(response.totalRecords).toBe(1);
    expect(response.items[0].ticketNumber).toBe("MV-090726-001");
  });

  it("should_throw_not_found_error_when_ticket_id_is_missing", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {} as any;
    const ticketRepository = {
      findTickets: jest.fn(),
      findTicketDetailById: jest.fn().mockResolvedValue(null),
      stampOpenedAtIfNeeded: jest.fn(),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService, mockPolicySnapshot);

    await expect(service.getTicketById("ticket-unknown")).rejects.toThrow(NotFoundError);
  });

  it("should_create_ticket_comment", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {} as any;
    const ticketRepository = {
      findTicketById: jest.fn().mockResolvedValue({ id: "ticket-1" }),
      createComment: jest.fn().mockResolvedValue({
        id: "comment-1",
        ticketId: "ticket-1",
        comment: "Customer shared update",
        internal: false,
        createdAt: new Date("2026-07-10T09:00:00.000Z"),
        createdBy: null,
        activity: {
          metadata: {
            commentType: "CUSTOMER",
            userName: "Coordinator",
            userRole: "COORDINATOR",
          },
        },
      }),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    const result = await service.addComment("ticket-1", {
      commentType: "CUSTOMER",
      text: "Customer shared update",
      userName: "Coordinator",
      userRole: "COORDINATOR",
    });

    expect(ticketRepository.createComment).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: "comment-1",
      ticketId: "ticket-1",
      commentType: "CUSTOMER",
      text: "Customer shared update",
    });
  });

  it("should_return_ticket_attachments", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {} as any;
    const ticketRepository = {
      findTicketById: jest.fn().mockResolvedValue({ id: "ticket-1" }),
      findAttachments: jest.fn().mockResolvedValue([
        {
          id: "att-1",
          ticketId: "ticket-1",
          fileUrl: "attachment-ref://tickets/ticket-1/attachments/file-1",
          fileType: "application/pdf",
          uploadedAt: new Date("2026-07-10T09:00:00.000Z"),
          activity: {
            metadata: {
              fileName: "invoice.pdf",
              fileSize: 1024,
              uploadedBy: "Coordinator",
            },
          },
        },
      ]),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    const result = await service.getAttachments("ticket-1");

    expect(result[0]).toMatchObject({
      id: "att-1",
      fileName: "invoice.pdf",
      fileSize: 1024,
      uploadedBy: "Coordinator",
    });
  });

  it("should_assign_technician_to_ticket", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {} as any;
    const ticketRepository = {
      findTicketById: jest.fn().mockResolvedValue({ id: "ticket-1" }),
      findTechnicianById: jest.fn().mockResolvedValue({ id: "tech-1", name: "Tech One", role: "TECHNICIAN" }),
      assignTechnician: jest.fn().mockResolvedValue({
        id: "ticket-1",
        updatedAt: new Date("2026-07-10T09:00:00.000Z"),
        assignedTo: { id: "tech-1", name: "Tech One" },
        activity: {
          performedAt: new Date("2026-07-10T09:00:00.000Z"),
          metadata: { assignmentNotes: "Urgent" },
        },
      }),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    const result = await service.assignTechnician("ticket-1", {
      technicianId: "tech-1",
      assignmentNotes: "Urgent",
    });

    expect(result).toMatchObject({
      ticketId: "ticket-1",
      technicianId: "tech-1",
      technicianName: "Tech One",
      assignmentNotes: "Urgent",
    });
  });

  it("should_reject_invalid_status_transition", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {
      findStatusByName: jest.fn(),
    } as any;
    const ticketRepository = {
      findTicketOperationContext: jest.fn().mockResolvedValue({
        id: "ticket-1",
        eta: null,
        status: { id: "status-open", name: "Open" },
      }),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    await expect(
      service.updateStatus("ticket-1", {
        status: "Closed",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("should_update_ticket_charges", async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const masterRepository = {} as any;
    const ticketRepository = {
      findTicketById: jest.fn().mockResolvedValue({ id: "ticket-1" }),
      updateTicketCharges: jest.fn().mockResolvedValue({
        id: "ticket-1",
        estimatedCharges: 800,
        finalCharges: 700,
        updatedAt: new Date("2026-07-10T09:00:00.000Z"),
      }),
    } as any;
    const ticketNumberService = { generateNextTicketNumber: jest.fn() } as any;
    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);

    const result = await service.updateCharges("ticket-1", {
      labourCharges: 500,
      partsCharges: 300,
      discount: 100,
      totalCharges: 700,
    });

    expect(result).toMatchObject({
      ticketId: "ticket-1",
      labourCharges: 500,
      partsCharges: 300,
      discount: 100,
      totalCharges: 700,
    });
  });
});
