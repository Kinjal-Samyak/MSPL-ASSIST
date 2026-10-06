import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { ApplicationError } from "../../errors";
import { buildIssueCategoryMenu, buildAddMoreIssuesMenu } from "../helpers/menu-builder";
import type { SelectedIssue } from "../conversation-context";
import {
  IssueCategorySelectionMethod,
  IssueCategoryValidationErrorCode,
  IssueCategoryValidator,
} from "../../validators/issue-category.validator";

/**
 * IssueCategoryHandler processes the WAITING_ISSUE_CATEGORY conversation state.
 *
 * Pure processor that:
 * - Accepts numeric (1-N) or category name selection
 * - Validates against provided issue categories
 * - Stores selected issue with ID and display name
 * - Prevents duplicate selections (by ID)
 * - Asks if customer wants to add more issues
 *
 * No external dependencies:
 * - Does NOT inject services
 * - Does NOT query database
 * - Receives all needed data via ConversationContext.issueCategories
 */
export class IssueCategoryHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    const categories = context.issueCategories ?? [];
    const selectedIssues = context.data.selectedIssues ?? [];

    logger.info({
      service: "IssueCategoryHandler",
      action: "handle",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      messageReceived: context.request.message,
    });

    if (!categories || categories.length === 0) {
      logger.error({
        service: "IssueCategoryHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: "No issue categories available in context",
      });

      throw new ApplicationError("Issue categories not available.");
    }

    const validationResult = IssueCategoryValidator.validateSelection(
      context.request.message,
      categories,
      selectedIssues
    );

    if (!validationResult.isValid) {
      if (validationResult.errorCode === IssueCategoryValidationErrorCode.DUPLICATE_SELECTION) {
        const duplicateCategoryName = validationResult.duplicateCategory?.name ?? "";

        logger.info({
          service: "IssueCategoryHandler",
          action: "handle",
          event: "DUPLICATE_SELECTION",
          sessionId: context.session.id,
          categoryId: validationResult.duplicateCategory?.id,
          categoryName: duplicateCategoryName,
        });

        const replyMessage = `You already selected "${duplicateCategoryName}". Choose a different issue or select "No" if done.`;

        return createResult(replyMessage, ConversationState.WAITING_ISSUE_CATEGORY, context.data, false);
      }

      logger.info({
        service: "IssueCategoryHandler",
        action: "handle",
        event: "INVALID_SELECTION",
        sessionId: context.session.id,
        invalidInput: validationResult.normalizedInput,
      });

      const menu = buildIssueCategoryMenu(categories);
      const replyMessage = `I didn't recognize that. Please try again:\n\n${menu}`;

      return createResult(replyMessage, ConversationState.WAITING_ISSUE_CATEGORY, context.data, false);
    }

    const selectedCategory = validationResult.value!.selectedCategory;

    logger.info({
      service: "IssueCategoryHandler",
      action: "handle",
      event: "SELECTION_METHOD",
      sessionId: context.session.id,
      method:
        validationResult.value!.selectionMethod === IssueCategorySelectionMethod.NUMERIC
          ? "NUMERIC"
          : "NAME",
      input: validationResult.normalizedInput,
      categoryId: selectedCategory.id,
    });

    // Add to selected issues and preserve existing data
    const newIssue: SelectedIssue = {
      issueCategoryId: selectedCategory.id,
      issueCategoryName: selectedCategory.name,
    };

    const updatedData = {
      ...context.data,
      selectedIssues: [...selectedIssues, newIssue],
    };

    logger.info({
      service: "IssueCategoryHandler",
      action: "handle",
      event: LogEvent.ISSUE_ADDED,
      sessionId: context.session.id,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      totalSelected: updatedData.selectedIssues?.length,
    });

    const addMoreMenu = buildAddMoreIssuesMenu();
    const replyMessage = `Added "${selectedCategory.name}" to your issues.\n\nWould you like to add another issue?\n\n${addMoreMenu}`;

    return createResult(replyMessage, ConversationState.WAITING_ADD_MORE_ISSUES, updatedData, false);
  }
}
