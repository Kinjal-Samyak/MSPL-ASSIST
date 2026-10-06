import type { ValidationResult } from "../shared/validation-result";

const ISSUE_DESCRIPTION_MIN_LENGTH = 10;
const ISSUE_DESCRIPTION_MAX_LENGTH = 500;

export class IssueDescriptionValidator {
  static validateAndNormalize(description: string | undefined): ValidationResult<string> {
    if (typeof description !== "string") {
      return {
        isValid: false,
        errorMessage: "Description cannot be empty.",
      };
    }

    const normalizedDescription = description.trim();

    if (!normalizedDescription) {
      return {
        isValid: false,
        errorMessage: "Description cannot be empty.",
      };
    }

    if (normalizedDescription.length < ISSUE_DESCRIPTION_MIN_LENGTH) {
      return {
        isValid: false,
        errorMessage: "Description must be at least 10 characters.",
      };
    }

    if (normalizedDescription.length > ISSUE_DESCRIPTION_MAX_LENGTH) {
      return {
        isValid: false,
        errorMessage: "Description must not exceed 500 characters.",
      };
    }

    return {
      isValid: true,
      value: normalizedDescription,
    };
  }
}
