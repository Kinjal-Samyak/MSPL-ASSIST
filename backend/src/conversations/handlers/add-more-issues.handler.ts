import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { buildIssueCategoryMenu, buildAddMoreIssuesMenu } from "../helpers/menu-builder";
import { ApplicationError } from "../../errors";

/**
 * AddMoreIssuesHandler processes the WAITING_ADD_MORE_ISSUES conversation state.
 *
 * Pure processor that:
 * - Accepts "Yes" (1) or "No" (2)
 * - If Yes: Returns issue categories for user to add more
 * - If No: Transitions to WAITING_ISSUE_DESCRIPTION
 * - Preserves all conversation data (merge, not replace)
 *
 * No external dependencies:
 * - Does NOT inject services
 * - Does NOT query database
 * - Receives all needed data via ConversationContext.issueCategories
 */
export class AddMoreIssuesHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    const message = context.request.message.trim().toLowerCase();
    const categories = context.issueCategories ?? [];

    logger.info({
      service: "AddMoreIssuesHandler",
      action: "handle",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      messageReceived: context.request.message,
    });

    // User wants to add more issues
    if (message === "1" || message === "yes") {
      logger.info({
        service: "AddMoreIssuesHandler",
        action: "handle",
        event: "USER_CHOICE",
        sessionId: context.session.id,
        choice: "ADD_MORE_ISSUES",
      });

      if (!categories || categories.length === 0) {
        logger.error({
          service: "AddMoreIssuesHandler",
          action: "handle",
          event: LogEvent.OPERATION_FAILED,
          sessionId: context.session.id,
          errorMessage: "No issue categories available",
        });

        throw new ApplicationError("Issue categories not available.");
      }

      const menu = buildIssueCategoryMenu(categories);
      const replyMessage = `Great! Please select another issue.\n\n${menu}`;

      return createResult(replyMessage, ConversationState.WAITING_ISSUE_CATEGORY, context.data, false);
    }

    // User does not want to add more issues
    if (message === "2" || message === "no") {
      logger.info({
        service: "AddMoreIssuesHandler",
        action: "handle",
        event: "USER_CHOICE",
        sessionId: context.session.id,
        choice: "PROCEED_TO_DESCRIPTION",
      });

      const replyMessage = "Please describe your issue in detail.";

      return createResult(replyMessage, ConversationState.WAITING_ISSUE_DESCRIPTION, context.data, false);
    }

    // Invalid selection
    logger.info({
      service: "AddMoreIssuesHandler",
      action: "handle",
      event: "INVALID_SELECTION",
      sessionId: context.session.id,
      invalidInput: message,
    });

    const menu = buildAddMoreIssuesMenu();
    const replyMessage = `I didn't understand that. Would you like to add another issue?\n\n${menu}`;

    return createResult(replyMessage, ConversationState.WAITING_ADD_MORE_ISSUES, context.data, false);
  }
}
