import {
  IssueCategorySelectionMethod,
  IssueCategoryValidationErrorCode,
  IssueCategoryValidator,
} from "../../validators/issue-category.validator";

describe("IssueCategoryValidator", () => {
  const categories = [
    { id: "issue-1", name: "Battery" },
    { id: "issue-2", name: "Brake" },
  ];

  it("should_validate_numeric_selection_successfully", () => {
    const result = IssueCategoryValidator.validateSelection("1", categories, []);

    expect(result.isValid).toBe(true);
    expect(result.value).toEqual({
      selectedCategory: categories[0],
      selectionMethod: IssueCategorySelectionMethod.NUMERIC,
    });
  });

  it("should_return_duplicate_error_when_issue_already_selected", () => {
    const selectedIssues = [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }];
    const result = IssueCategoryValidator.validateSelection("battery", categories, selectedIssues);

    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe(IssueCategoryValidationErrorCode.DUPLICATE_SELECTION);
    expect(result.duplicateCategory?.id).toBe("issue-1");
  });

  it("should_return_invalid_selection_error_when_input_does_not_match_any_category", () => {
    const result = IssueCategoryValidator.validateSelection("invalid-option", categories, []);

    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe(IssueCategoryValidationErrorCode.INVALID_SELECTION);
  });
});
