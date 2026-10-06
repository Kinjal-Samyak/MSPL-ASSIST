import type { SelectedIssue } from "../conversations/conversation-context";
import type { IssueCategory } from "../conversations/engine-context";
import type { ValidationResult } from "../shared/validation-result";

export enum IssueCategorySelectionMethod {
  NUMERIC = "NUMERIC",
  NAME = "NAME",
}

export enum IssueCategoryValidationErrorCode {
  INVALID_SELECTION = "INVALID_SELECTION",
  DUPLICATE_SELECTION = "DUPLICATE_SELECTION",
}

export interface IssueCategoryValidationValue {
  selectedCategory: IssueCategory;
  selectionMethod: IssueCategorySelectionMethod;
}

export interface IssueCategoryValidationResult extends ValidationResult<IssueCategoryValidationValue> {
  normalizedInput: string;
  errorCode?: IssueCategoryValidationErrorCode;
  duplicateCategory?: IssueCategory;
}

export class IssueCategoryValidator {
  static validateSelection(
    input: string | undefined,
    categories: IssueCategory[],
    selectedIssues: SelectedIssue[]
  ): IssueCategoryValidationResult {
    const normalizedInput = (input ?? "").trim().toLowerCase();

    if (!normalizedInput) {
      return {
        isValid: false,
        normalizedInput,
        errorCode: IssueCategoryValidationErrorCode.INVALID_SELECTION,
      };
    }

    const numericSelection = parseInt(normalizedInput, 10);
    let selectedCategory: IssueCategory | undefined;
    let selectionMethod: IssueCategorySelectionMethod | undefined;

    if (!Number.isNaN(numericSelection) && numericSelection >= 1 && numericSelection <= categories.length) {
      selectedCategory = categories[numericSelection - 1];
      selectionMethod = IssueCategorySelectionMethod.NUMERIC;
    } else {
      selectedCategory = categories.find((category) => category.name.toLowerCase() === normalizedInput);
      if (selectedCategory) {
        selectionMethod = IssueCategorySelectionMethod.NAME;
      }
    }

    if (!selectedCategory || !selectionMethod) {
      return {
        isValid: false,
        normalizedInput,
        errorCode: IssueCategoryValidationErrorCode.INVALID_SELECTION,
      };
    }

    const duplicateCategory = selectedIssues.find(
      (selectedIssue) => selectedIssue.issueCategoryId === selectedCategory.id
    );

    if (duplicateCategory) {
      return {
        isValid: false,
        normalizedInput,
        errorCode: IssueCategoryValidationErrorCode.DUPLICATE_SELECTION,
        duplicateCategory: selectedCategory,
      };
    }

    return {
      isValid: true,
      normalizedInput,
      value: {
        selectedCategory,
        selectionMethod,
      },
    };
  }
}
