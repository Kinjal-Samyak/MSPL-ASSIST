import { ApplicationError } from "../../errors";
import { ConversationEngine } from "../../conversations/conversation.engine";
import { ConversationState } from "../../conversations/conversation.state";
import { StateHandlerFactory } from "../../conversations/state-handler.factory";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("ConversationEngine", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_resolve_handler_and_return_conversation_result", async () => {
    const handler = {
      handle: jest.fn().mockResolvedValue({
        replyMessage: "ok",
        nextState: ConversationState.MAIN_MENU,
        updatedConversationData: {},
        isConversationComplete: false,
      }),
    };
    jest.spyOn(StateHandlerFactory, "resolve").mockReturnValue(handler as any);
    const engine = new ConversationEngine();
    const context = buildConversationContext({ state: ConversationState.MAIN_MENU, message: "hello" });

    const result = await engine.process(context);

    expect(result.replyMessage).toBe("ok");
    expect(handler.handle).toHaveBeenCalledWith(context);
  });

  it("should_wrap_non_application_error_as_application_error", async () => {
    const handler = { handle: jest.fn().mockRejectedValue(new Error("boom")) };
    jest.spyOn(StateHandlerFactory, "resolve").mockReturnValue(handler as any);
    const engine = new ConversationEngine();
    const context = buildConversationContext({ state: ConversationState.MAIN_MENU, message: "hello" });

    await expect(engine.process(context)).rejects.toThrow(ApplicationError);
  });
});
