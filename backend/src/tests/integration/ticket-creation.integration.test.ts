import { TicketCreationHandler } from "../../conversations/handlers/ticket-creation.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { TicketRepository } from "../../repositories/ticket.repository";
import { TicketService } from "../../services/ticket.service";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";
import * as validatorModule from "../../validators/ticket.validator";

describe("Integration - Ticket Creation", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  const contextData = {
    registeredCustomer: {
      mobile: "9876543210",
      customerId: "cust-1",
      customerName: "Rider One",
      verified: true,
    },
    activeDeployment: {
      deploymentId: "dep-1",
      vehicleId: "veh-1",
      vehicleNumber: "WB12AB1234",
      vehicleModel: "M7",
      hubId: "hub-1",
      hubName: "Kolkata Hub",
      rentalStatus: "ACTIVE",
    },
    selectedIssues: [
      {
        issueCategoryId: "issue-1",
        issueCategoryName: "Battery",
        description: "Battery drains quickly during rides",
        photoUrls: ["PHOTO_001"],
      },
    ],
  };

  it("should_return_existing_ticket_response_for_duplicate_active_ticket", async () => {
    const ticketService = {
      createTicket: jest.fn().mockResolvedValue({
        existingTicket: true,
        ticketNumber: "MV-090726-001",
        currentStatus: "Open",
      }),
    } as any;
    const handler = new TicketCreationHandler(ticketService);
    const context = buildConversationContext({
      state: ConversationState.WAITING_TICKET_CREATION,
      data: contextData,
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.CONFIRMATION);
    expect(result.replyMessage).toContain("already have an active service request");
    expect(result.replyMessage).toContain("MV-090726-001");
  });

  it("should_keep_context_and_return_retry_message_when_ticket_service_fails", async () => {
    const ticketService = {
      createTicket: jest.fn().mockRejectedValue(new Error("ticket service failure")),
    } as any;
    const handler = new TicketCreationHandler(ticketService);
    const context = buildConversationContext({
      state: ConversationState.WAITING_TICKET_CREATION,
      data: contextData,
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_TICKET_CREATION);
    expect(result.updatedConversationData).toEqual(context.data);
    expect(result.replyMessage).toContain("unable to create your service request");
  });

  it("should_execute_ticket_service_transaction_and_delegate_creation_to_repository", async () => {
    const createdTicket = {
      id: "ticket-1",
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
      registeredMobile: "9876543210",
      issueCategoryId: "issue-1",
      issueDescription: "Battery drains quickly during rides",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: true,
      mvTrackNumber: "dep-1",
      vehicleNumber: "WB12AB1234",
    } as any);

    const service = new TicketService(prisma, masterRepository, ticketRepository, ticketNumberService);
    const response = await service.createTicket({
      registeredMobile: "9876543210",
      issueCategoryId: "issue-1",
      issueDescription: "Battery drains quickly during rides",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(ticketRepository.createTicketWithHistoryAndActivity).toHaveBeenCalledTimes(1);
    expect(ticketRepository.createTicketWithHistoryAndActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        rowVersion: 1,
        notificationStatus: "NOT_SENT",
      }),
      expect.anything()
    );
    expect(response.existingTicket).toBe(false);
    expect(response.ticketNumber).toBe("MV-090726-010");
  });

  it("should_create_ticket_issue_history_and_activity_records_in_single_repository_flow", async () => {
    const ticketRepository = new TicketRepository({} as any);
    const tx = {
      ticket: {
        create: jest.fn().mockResolvedValue({
          id: "ticket-1",
          ticketNumber: "MV-090726-010",
          createdAt: new Date("2026-07-09T10:00:00.000Z"),
        }),
      },
      ticketIssueItem: { create: jest.fn().mockResolvedValue({ id: "item-1" }) },
      ticketHistory: { create: jest.fn().mockResolvedValue({ id: "history-1" }) },
      ticketActivity: { create: jest.fn().mockResolvedValue({ id: "activity-1" }) },
    } as any;

    const ticket = await ticketRepository.createTicketWithHistoryAndActivity(
      {
        ticketNumber: "MV-090726-010",
        customerId: "cust-1",
        deploymentId: "dep-1",
        issueCategoryId: "issue-1",
        statusId: "status-open",
        source: "WHATSAPP",
        priority: "MEDIUM",
        issueDescription: "Battery drains quickly",
        sendUpdate: true,
        notificationStatus: "NOT_SENT",
        deploymentVerified: true,
        rowVersion: 1,
      },
      tx
    );

    expect(tx.ticket.create).toHaveBeenCalledTimes(1);
    expect(tx.ticketIssueItem.create).toHaveBeenCalledTimes(1);
    expect(tx.ticketHistory.create).toHaveBeenCalledTimes(1);
    expect(tx.ticketActivity.create).toHaveBeenCalledTimes(1);
    expect(ticket.id).toBe("ticket-1");
  });
});
