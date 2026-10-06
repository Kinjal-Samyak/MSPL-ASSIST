import { CustomerVerificationHandler } from "../../conversations/handlers/customer-verification.handler";
import { RegisteredMobileHandler } from "../../conversations/handlers/registered-mobile.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { applyConversationResult } from "../helpers/integration-workflow.helper";
import { logger } from "../../utils/logger";

describe("Integration - Customer Registration and Verification", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_stay_in_verifying_customer_when_customer_not_found", async () => {
    const customerService = {
      findByRegisteredMobile: jest.fn().mockResolvedValue(null),
    } as any;
    const registeredMobileHandler = new RegisteredMobileHandler();
    const customerVerificationHandler = new CustomerVerificationHandler(customerService);

    let context = buildConversationContext({
      state: ConversationState.WAITING_REGISTERED_MOBILE,
      message: "9876543210",
      data: {},
    });

    const mobileResult = await registeredMobileHandler.handle(context);
    expect(mobileResult.nextState).toBe(ConversationState.VERIFYING_CUSTOMER);

    context = applyConversationResult(context, mobileResult, "continue");
    const customerResult = await customerVerificationHandler.handle(context);

    expect(customerResult.nextState).toBe(ConversationState.VERIFYING_CUSTOMER);
    expect(customerResult.replyMessage).toContain("could not find a rider");
    expect(customerService.findByRegisteredMobile).toHaveBeenCalledWith("9876543210");
  });
});
