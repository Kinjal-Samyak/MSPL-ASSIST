import type { ValidationResult } from "../../shared/validation-result";

describe("ValidationResult type", () => {
  it("should_support_valid_result_shape", () => {
    const result: ValidationResult<string> = {
      isValid: true,
      value: "normalized",
    };

    expect(result.isValid).toBe(true);
    expect(result.value).toBe("normalized");
  });

  it("should_support_invalid_result_shape", () => {
    const result: ValidationResult<string> = {
      isValid: false,
      errorMessage: "Invalid input",
    };

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("Invalid input");
  });
});
