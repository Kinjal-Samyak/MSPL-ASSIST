import { logger } from "../../utils/logger";

describe("logger", () => {
  it("should_call_console_info_when_info_receives_string", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined);

    logger.info("hello");

    expect(spy).toHaveBeenCalledWith("hello");
  });

  it("should_call_console_error_with_stringified_object_when_error_receives_object", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error({ event: "failure" });

    expect(spy).toHaveBeenCalledWith(JSON.stringify({ event: "failure" }));
  });
});
