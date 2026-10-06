import { ApplicationError } from "../../errors";
import { CustomerVerificationHandler } from "../../conversations/handlers/customer-verification.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("CustomerVerificationHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_update_context_and_transition_when_customer_is_found", async () => {
    const customerService = {
      findByRegisteredMobile: jest.fn().mockResolvedValue({ id: "cust-1", name: "Rider One" }),
    } as any;
    const handler = new CustomerVerificationHandler(customerService);
    const context = buildConversationContext({
      state: ConversationState.VERIFYING_CUSTOMER,
      data: { registeredCustomer: { mobile: "9876543210", verified: false } },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.VERIFYING_DEPLOYMENT);
    expect(result.updatedConversationData.registeredCustomer?.customerId).toBe("cust-1");
    expect(result.updatedConversationData.registeredCustomer?.verified).toBe(true);
  });

  it("should_throw_application_error_when_registered_mobile_is_missing_in_context", async () => {
    const handler = new CustomerVerificationHandler({ findByRegisteredMobile: jest.fn() } as any);
    const context = buildConversationContext({
      state: ConversationState.VERIFYING_CUSTOMER,
      data: {},
    });

    await expect(handler.handle(context)).rejects.toThrow(ApplicationError);
  });
});
