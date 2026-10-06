import { RegisteredMobileValidator } from "../../validators/registered-mobile.validator";

describe("RegisteredMobileValidator", () => {
  it("should_validate_and_normalize_mobile_when_input_has_country_code_and_spaces", () => {
    const result = RegisteredMobileValidator.validateAndNormalize("+91 98765 43210");

    expect(result).toEqual({
      isValid: true,
      value: "9876543210",
    });
  });

  it("should_return_invalid_when_mobile_prefix_is_not_valid", () => {
    const result = RegisteredMobileValidator.validateAndNormalize("1234567890");

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("10-digit registered mobile");
  });

  it("should_return_invalid_when_input_is_empty", () => {
    const result = RegisteredMobileValidator.validateAndNormalize("   ");

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("10-digit registered mobile");
  });
});
