import {
  ConversationState,
  getConversationState,
  isValidConversationState,
} from "../../conversations/conversation.state";

describe("ConversationState", () => {
  it("should_validate_known_state_values", () => {
    expect(isValidConversationState(ConversationState.MAIN_MENU)).toBe(true);
    expect(isValidConversationState("UNKNOWN")).toBe(false);
  });

  it("should_parse_state_case_insensitively", () => {
    expect(getConversationState(" waiting_photo ")).toBe(ConversationState.WAITING_PHOTO);
    expect(getConversationState("invalid")).toBeNull();
  });
});
