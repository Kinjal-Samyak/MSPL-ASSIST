import { ApplicationError } from "../../errors";
import { ConversationState } from "../../conversations/conversation.state";
import { StateHandlerFactory } from "../../conversations/state-handler.factory";
import { logger } from "../../utils/logger";

describe("StateHandlerFactory", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_resolve_registered_handler_for_main_menu_state", () => {
    const handler = StateHandlerFactory.resolve(ConversationState.MAIN_MENU);

    expect(handler).toBeDefined();
    expect(handler.constructor.name).toBe("MainMenuHandler");
  });

  it("should_allow_registering_custom_handler_for_state", async () => {
    const customHandler = {
      handle: jest.fn(),
    };

    StateHandlerFactory.register(ConversationState.TRACK_TICKET, customHandler as any);

    const resolved = StateHandlerFactory.resolve(ConversationState.TRACK_TICKET);
    expect(resolved).toBe(customHandler);
  });

  it("should_throw_application_error_for_unregistered_state", () => {
    expect(() => StateHandlerFactory.resolve("UNKNOWN_STATE" as ConversationState)).toThrow(
      ApplicationError
    );
  });
});
