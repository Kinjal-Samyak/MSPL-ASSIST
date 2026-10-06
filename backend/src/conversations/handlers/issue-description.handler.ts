import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { buildPhotoMenu } from "../helpers/menu-builder";
import { ApplicationError } from "../../errors";
import type { SelectedIssue } from "../conversation-context";
import { IssueDescriptionValidator } from "../../validators/issue-description.validator";

/**
 * IssueDescriptionHandler processes the WAITING_ISSUE_DESCRIPTION conversation state.
 *
 * Responsibilities:
 * - Collect description for ONE issue at a time
 * - Find first issue without description
 * - Validate description (10-500 chars)
 * - Store description in selectedIssues[n].description
 * - Preserve previously entered descriptions
 * - Ask for next issue description if more exist
 * - Transition to WAITING_PHOTO when all issues have descriptions
 *
 * Pure processor (no services, no database access).
 */
export class IssueDescriptionHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    const message = context.request.message;
    const selectedIssues = context.data.selectedIssues ?? [];

    logger.info({
      service: "IssueDescriptionHandler",
      action: "handle",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      messageReceived: message.substring(0, 50), // Log first 50 chars
      totalIssues: selectedIssues.length,
    });

    // Check if we have selected issues
    if (!selectedIssues || selectedIssues.length === 0) {
      logger.error({
        service: "IssueDescriptionHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: "No selected issues in context",
      });

      throw new ApplicationError("No selected issues found.");
    }

    // Find the first issue without description
    const issueIndex = this.findNextIssueWithoutDescription(selectedIssues);

    if (issueIndex === -1) {
      // All issues have descriptions - transition to WAITING_PHOTO
      logger.info({
        service: "IssueDescriptionHandler",
        action: "handle",
        event: "ALL_DESCRIPTIONS_COMPLETE",
        sessionId: context.session.id,
        totalIssues: selectedIssues.length,
      });

      const photoMenu = buildPhotoMenu();
      const replyMessage = `Thank you.\n\nWould you like to upload a photo of the issue?\n\n${photoMenu}`;

      return createResult(replyMessage, ConversationState.WAITING_PHOTO, context.data, false);
    }

    const validation = IssueDescriptionValidator.validateAndNormalize(message);

    if (!validation.isValid) {
      logger.info({
        service: "IssueDescriptionHandler",
        action: "handle",
        event: "VALIDATION_FAILED",
        sessionId: context.session.id,
        reason: validation.errorMessage ?? "Unknown validation error",
      });

      const replyMessage = this.createValidationResponse(
        validation.errorMessage ?? "Invalid description"
      );

      return createResult(replyMessage, ConversationState.WAITING_ISSUE_DESCRIPTION, context.data, false);
    }

    const normalizedDescription = validation.value!;

    // Update the issue with description
    const updatedIssues = this.updateIssueDescription(
      selectedIssues,
      issueIndex,
      normalizedDescription
    );

    logger.info({
      service: "IssueDescriptionHandler",
      action: "handle",
      event: LogEvent.ISSUE_ADDED,
      sessionId: context.session.id,
      issueName: selectedIssues[issueIndex].issueCategoryName,
      descriptionLength: normalizedDescription.length,
      issuesWithDescriptions: updatedIssues.filter((i) => i.description).length,
      totalIssues: updatedIssues.length,
    });

    // Prepare updated data
    const updatedData = {
      ...context.data,
      selectedIssues: updatedIssues,
    };

    // Check if there are more issues without descriptions
    const nextIssueIndex = this.findNextIssueWithoutDescription(updatedIssues);

    if (nextIssueIndex === -1) {
      // All issues now have descriptions - transition to WAITING_PHOTO
      logger.info({
        service: "IssueDescriptionHandler",
        action: "handle",
        event: "ALL_DESCRIPTIONS_COMPLETE",
        sessionId: context.session.id,
        totalIssues: updatedIssues.length,
      });

      const photoMenu = buildPhotoMenu();
      const replyMessage = `Thank you.\n\nWould you like to upload a photo of the issue?\n\n${photoMenu}`;

      return createResult(replyMessage, ConversationState.WAITING_PHOTO, updatedData, false);
    }

    // More issues need descriptions - stay in WAITING_ISSUE_DESCRIPTION
    const nextIssue = updatedIssues[nextIssueIndex];
    const replyMessage = `Thank you. Now, please describe the ${nextIssue.issueCategoryName} issue.`;

    return createResult(replyMessage, ConversationState.WAITING_ISSUE_DESCRIPTION, updatedData, false);
  }

  /**
   * Find the index of the first issue without a description.
   * Returns -1 if all issues have descriptions.
   */
  private findNextIssueWithoutDescription(issues: SelectedIssue[]): number {
    return issues.findIndex((issue) => !issue.description || issue.description.trim().length === 0);
  }

  /**
   * Update a specific issue with its description.
   * Preserves all other data.
   */
  private updateIssueDescription(
    issues: SelectedIssue[],
    issueIndex: number,
    description: string
  ): SelectedIssue[] {
    const updated = [...issues];
    updated[issueIndex] = {
      ...updated[issueIndex],
      description,
    };
    return updated;
  }

  /**
   * Create a user-friendly validation error message.
   */
  private createValidationResponse(errorMessage: string): string {
    return `${errorMessage}\n\nPlease try again.`;
  }
}
