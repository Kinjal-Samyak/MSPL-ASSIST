import { LogEvent, isValidLogEvent } from "../../shared/log-event";

describe("LogEvent", () => {
  it("should_validate_known_log_event_values", () => {
    expect(isValidLogEvent(LogEvent.CONVERSATION_STARTED)).toBe(true);
    expect(isValidLogEvent("UNKNOWN_EVENT")).toBe(false);
  });

  it("should_return_false_for_non_string_values", () => {
    expect(isValidLogEvent(null)).toBe(false);
    expect(isValidLogEvent(123)).toBe(false);
  });
});
