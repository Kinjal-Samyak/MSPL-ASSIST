import { TicketCreationHandler } from "../../conversations/handlers/ticket-creation.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("TicketCreationHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_transition_to_confirmation_when_ticket_is_created", async () => {
    const ticketService = {
      createTicket: jest.fn().mockResolvedValue({
        existingTicket: false,
        ticketId: "ticket-1",
        ticketNumber: "MV-090726-001",
        createdAt: "2026-07-09T10:00:00.000Z",
      }),
    } as any;
    const handler = new TicketCreationHandler(ticketService);
    const context = buildConversationContext({
      state: ConversationState.WAITING_TICKET_CREATION,
      data: {
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
            description: "Battery drains quickly",
            photoUrls: [],
          },
        ],
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.CONFIRMATION);
    expect(result.updatedConversationData.ticket?.ticketId).toBe("ticket-1");
  });

  it("should_stay_in_waiting_ticket_creation_when_service_fails", async () => {
    const ticketService = {
      createTicket: jest.fn().mockRejectedValue(new Error("service failed")),
    } as any;
    const handler = new TicketCreationHandler(ticketService);
    const context = buildConversationContext({
      state: ConversationState.WAITING_TICKET_CREATION,
      data: {
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
            description: "Battery drains quickly",
            photoUrls: [],
          },
        ],
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_TICKET_CREATION);
    expect(result.replyMessage).toContain("unable to create your service request");
  });
});
