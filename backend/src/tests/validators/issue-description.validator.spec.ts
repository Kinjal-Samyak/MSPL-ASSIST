import { IssueDescriptionValidator } from "../../validators/issue-description.validator";

describe("IssueDescriptionValidator", () => {
  it("should_accept_description_within_min_max_length_and_trim_value", () => {
    const result = IssueDescriptionValidator.validateAndNormalize("   battery issue   ");

    expect(result).toEqual({
      isValid: true,
      value: "battery issue",
    });
  });

  it("should_reject_when_description_is_shorter_than_minimum", () => {
    const result = IssueDescriptionValidator.validateAndNormalize("too short");

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("Description must be at least 10 characters.");
  });

  it("should_reject_when_description_exceeds_maximum_length", () => {
    const longDescription = "a".repeat(501);
    const result = IssueDescriptionValidator.validateAndNormalize(longDescription);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("Description must not exceed 500 characters.");
  });
});
