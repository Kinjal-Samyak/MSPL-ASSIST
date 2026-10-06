import { RegisteredMobileHandler } from "../../conversations/handlers/registered-mobile.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("RegisteredMobileHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_normalize_mobile_and_move_to_customer_verification", async () => {
    const handler = new RegisteredMobileHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_REGISTERED_MOBILE,
      message: "+91 98765 43210",
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.VERIFYING_CUSTOMER);
    expect(result.updatedConversationData.registeredCustomer?.mobile).toBe("9876543210");
  });

  it("should_stay_in_same_state_when_mobile_is_invalid", async () => {
    const handler = new RegisteredMobileHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_REGISTERED_MOBILE,
      message: "12345",
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_REGISTERED_MOBILE);
    expect(result.replyMessage).toContain("10-digit");
  });
});
