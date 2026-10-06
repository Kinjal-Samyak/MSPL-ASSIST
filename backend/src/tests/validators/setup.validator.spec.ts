import { ValidationError } from "../../errors";
import { validateBootstrapSetupPayload } from "../../validators/setup.validator";

describe("setup.validator", () => {
  it("should_validate_bootstrap_payload", () => {
    const result = validateBootstrapSetupPayload({
      companyName: "MSPL Assist",
      adminName: "Admin User",
      email: "ADMIN@MSPL.IN",
      password: "Secret123!",
      confirmPassword: "Secret123!",
    });

    expect(result.email).toBe("admin@mspl.in");
  });

  it("should_throw_when_password_confirmation_mismatches", () => {
    expect(() =>
      validateBootstrapSetupPayload({
        companyName: "MSPL Assist",
        adminName: "Admin User",
        email: "admin@mspl.in",
        password: "secret123",
        confirmPassword: "different",
      })
    ).toThrow(ValidationError);
  });
});

