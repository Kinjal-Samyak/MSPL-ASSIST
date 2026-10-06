import { ConversationCommand } from "../../conversations/conversation.command";
import { ValidationError } from "../../errors";
import { detectCommand, validateConversationRequest } from "../../validators/conversation.validator";

describe("ConversationValidator", () => {
  it("should_validate_and_normalize_whatsapp_number_and_message", () => {
    const result = validateConversationRequest({
      whatsappNumber: "+91 99999-88877",
      message: "  hello  ",
    });

    expect(result).toEqual({
      whatsappNumber: "919999988877",
      message: "hello",
    });
  });

  it("should_throw_validation_error_when_message_is_empty", () => {
    expect(() =>
      validateConversationRequest({
        whatsappNumber: "9999988877",
        message: "   ",
      })
    ).toThrow(ValidationError);
  });

  it("should_detect_start_command", () => {
    expect(detectCommand(" start ")).toBe(ConversationCommand.START);
  });
});
