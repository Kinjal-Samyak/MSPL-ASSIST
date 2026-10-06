import {
  ConversationCommand,
  getConversationCommand,
  isValidConversationCommand,
} from "../../conversations/conversation.command";

describe("ConversationCommand", () => {
  it("should_validate_known_command_values", () => {
    expect(isValidConversationCommand(ConversationCommand.START)).toBe(true);
    expect(isValidConversationCommand("INVALID")).toBe(false);
  });

  it("should_parse_command_case_insensitively", () => {
    expect(getConversationCommand(" reset ")).toBe(ConversationCommand.RESET);
    expect(getConversationCommand("unknown")).toBeNull();
  });
});
