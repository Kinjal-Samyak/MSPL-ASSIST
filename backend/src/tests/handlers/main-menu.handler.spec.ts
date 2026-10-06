import { MainMenuHandler } from "../../conversations/handlers/main-menu.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("MainMenuHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
  });

  it("should_show_main_menu_for_greeting_message", async () => {
    const handler = new MainMenuHandler();
    const context = buildConversationContext({ state: ConversationState.MAIN_MENU, message: "Hi" });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.MAIN_MENU);
    expect(result.replyMessage).toContain("MSPL Assist");
  });

  it("should_transition_to_issue_category_on_register_selection", async () => {
    const handler = new MainMenuHandler();
    const context = buildConversationContext({ state: ConversationState.MAIN_MENU, message: "1" });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_ISSUE_CATEGORY);
  });
});
