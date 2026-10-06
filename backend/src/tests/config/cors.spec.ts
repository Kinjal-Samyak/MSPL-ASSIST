import { buildCorsOptions, isOriginAllowed } from "../../config/cors";

describe("CORS origin policy", () => {
  it("should_always_allow_requests_with_no_Origin_header", () => {
    expect(isOriginAllowed(undefined, [], true)).toBe(true);
    expect(isOriginAllowed(undefined, ["https://app.example.com"], true)).toBe(true);
  });

  it("should_allow_any_localhost_or_127_0_0_1_origin_outside_production", () => {
    expect(isOriginAllowed("http://localhost:5173", [], false)).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:4000", [], false)).toBe(true);
    expect(isOriginAllowed("https://localhost:5174", [], false)).toBe(true);
  });

  it("should_reject_localhost_origins_in_production_unless_explicitly_allowlisted", () => {
    expect(isOriginAllowed("http://localhost:5173", [], true)).toBe(false);
    expect(isOriginAllowed("http://localhost:5173", ["http://localhost:5173"], true)).toBe(true);
  });

  it("should_allow_an_origin_that_is_in_the_allowlist_in_production", () => {
    expect(isOriginAllowed("https://app.example.com", ["https://app.example.com"], true)).toBe(true);
  });

  it("should_reject_an_origin_that_is_not_in_the_allowlist_in_production", () => {
    expect(isOriginAllowed("https://evil.example.com", ["https://app.example.com"], true)).toBe(false);
  });

  it("should_support_multiple_allowlisted_origins", () => {
    const allowed = ["https://app.example.com", "https://training.example.com"];
    expect(isOriginAllowed("https://app.example.com", allowed, true)).toBe(true);
    expect(isOriginAllowed("https://training.example.com", allowed, true)).toBe(true);
    expect(isOriginAllowed("https://other.example.com", allowed, true)).toBe(false);
  });

  it("should_ignore_a_trailing_slash_when_comparing_origins", () => {
    expect(isOriginAllowed("https://app.example.com", ["https://app.example.com/"], true)).toBe(true);
  });

  describe("buildCorsOptions", () => {
    it("should_invoke_the_callback_with_allow_true_for_an_allowed_origin", () => {
      const options = buildCorsOptions(["https://app.example.com"], true);
      const callback = jest.fn();
      (options.origin as Function)("https://app.example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should_invoke_the_callback_with_an_error_for_a_disallowed_origin", () => {
      const options = buildCorsOptions(["https://app.example.com"], true);
      const callback = jest.fn();
      (options.origin as Function)("https://evil.example.com", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
