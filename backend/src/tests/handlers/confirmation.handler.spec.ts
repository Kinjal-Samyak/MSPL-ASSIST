import { ApplicationError } from "../../errors";
import { ConfirmationHandler } from "../../conversations/handlers/confirmation.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("ConfirmationHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_generate_confirmation_message_and_mark_conversation_complete", async () => {
    const handler = new ConfirmationHandler();
    const context = buildConversationContext({
      state: ConversationState.CONFIRMATION,
      data: {
        ticket: {
          ticketId: "ticket-1",
          ticketNumber: "MV-090726-001",
          status: "Open",
          createdAt: "2026-07-09T10:00:00.000Z",
        },
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
        selectedIssues: [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }],
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.COMPLETED);
    expect(result.isConversationComplete).toBe(true);
    expect(result.replyMessage).toContain("service request has been successfully registered");
  });

  it("should_throw_application_error_when_ticket_is_missing_from_context", async () => {
    const handler = new ConfirmationHandler();
    const context = buildConversationContext({
      state: ConversationState.CONFIRMATION,
      data: {},
    });

    await expect(handler.handle(context)).rejects.toThrow(ApplicationError);
  });
});
