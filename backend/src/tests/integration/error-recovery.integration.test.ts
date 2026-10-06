import { ConversationEngine } from "../../conversations/conversation.engine";
import { MainMenuHandler } from "../../conversations/handlers/main-menu.handler";
import { TicketCreationHandler } from "../../conversations/handlers/ticket-creation.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { StateHandlerFactory } from "../../conversations/state-handler.factory";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("Integration - Error Recovery", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_preserve_context_and_return_retry_response_when_ticket_creation_fails", async () => {
    const ticketService = {
      createTicket: jest.fn().mockRejectedValue(new Error("failure")),
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
            photoUrls: ["PHOTO_001"],
          },
        ],
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_TICKET_CREATION);
    expect(result.updatedConversationData).toEqual(context.data);
    expect(result.replyMessage).toContain("Please try again");
    expect(logger.error).toHaveBeenCalled();
  });

  it("should_propagate_handler_errors_through_conversation_engine", async () => {
    const failingHandler = {
      handle: jest.fn().mockRejectedValue(new Error("handler failure")),
    } as any;
    StateHandlerFactory.register(ConversationState.MAIN_MENU, failingHandler);

    const engine = new ConversationEngine();
    const context = buildConversationContext({
      state: ConversationState.MAIN_MENU,
      message: "hello",
    });

    await expect(engine.process(context)).rejects.toThrow("Failed to process conversation.");

    StateHandlerFactory.register(ConversationState.MAIN_MENU, new MainMenuHandler());
  });
});
