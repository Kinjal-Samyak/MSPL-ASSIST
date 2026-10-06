import { createResult } from "../../conversations/conversation-result";
import { ConversationState } from "../../conversations/conversation.state";
import { buildIssueCategoryMenu, getEmojiNumber } from "../../conversations/helpers/menu-builder";

describe("Helper functions", () => {
  it("should_build_issue_category_menu_with_numbered_entries", () => {
    const menu = buildIssueCategoryMenu([
      { id: "issue-1", name: "Battery" },
      { id: "issue-2", name: "Brake" },
    ]);

    expect(menu).toContain("1️⃣ Battery");
    expect(menu).toContain("2️⃣ Brake");
  });

  it("should_return_fallback_number_when_emoji_index_exceeds_range", () => {
    expect(getEmojiNumber(11)).toBe("12");
  });

  it("should_create_conversation_result_for_valid_reply_message", () => {
    const result = createResult("ok", ConversationState.MAIN_MENU, {}, false);

    expect(result.nextState).toBe(ConversationState.MAIN_MENU);
    expect(result.replyMessage).toBe("ok");
  });
});
