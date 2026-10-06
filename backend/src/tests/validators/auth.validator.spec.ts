import { ValidationError } from "../../errors";
import { validateLoginPayload, validateRefreshTokenPayload } from "../../validators/auth.validator";

describe("AuthValidator", () => {
  it("should_validate_login_payload", () => {
    const result = validateLoginPayload({
      email: " ADMIN@MSPL.IN ",
      password: "secret",
    });

    expect(result).toEqual({
      email: "admin@mspl.in",
      password: "secret",
    });
  });

  it("should_reject_login_payload_without_email", () => {
    expect(() =>
      validateLoginPayload({
        password: "secret",
      })
    ).toThrow(ValidationError);
  });

  it("should_validate_refresh_token_payload", () => {
    const result = validateRefreshTokenPayload({
      refreshToken: "refresh-token",
    });

    expect(result).toEqual({
      refreshToken: "refresh-token",
    });
  });

  it("should_reject_refresh_token_payload_without_token", () => {
    expect(() => validateRefreshTokenPayload({})).toThrow(ValidationError);
  });
});

