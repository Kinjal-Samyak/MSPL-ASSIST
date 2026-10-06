import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import {
  buildPhotoMenu,
  buildPhotoMenuForIssue,
  buildPhotoUploadPrompt,
} from "../helpers/menu-builder";
import { ApplicationError } from "../../errors";
import type { SelectedIssue } from "../conversation-context";

/**
 * PhotoHandler processes the WAITING_PHOTO conversation state.
 *
 * Responsibilities:
 * - Accept "Yes" (1) or "Skip" (2) for photo upload
 * - If Yes: Transition to WAITING_PHOTO_UPLOAD to collect placeholders
 * - If Skip: Move to next issue that needs photo decision, or transition to mobile
 * - Support multiple issues, each with independent photo decision
 *
 * Pure processor (no services, no database access).
 */
export class PhotoHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    const message = context.request.message.trim().toLowerCase();
    const selectedIssues = context.data.selectedIssues ?? [];

    logger.info({
      service: "PhotoHandler",
      action: "handle",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      messageReceived: message,
      totalIssues: selectedIssues.length,
    });

    if (!selectedIssues || selectedIssues.length === 0) {
      logger.error({
        service: "PhotoHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: "No selected issues in context",
      });

      throw new ApplicationError("No selected issues found.");
    }

    // Find the first issue without a photo decision (no photoUrls property yet)
    const issueIndex = this.findIssueNeedingPhotoDecision(selectedIssues);

    if (issueIndex === -1) {
      // All issues have photo decisions - transition to WAITING_REGISTERED_MOBILE
      logger.info({
        service: "PhotoHandler",
        action: "handle",
        event: "ALL_PHOTO_DECISIONS_COMPLETE",
        sessionId: context.session.id,
        totalIssues: selectedIssues.length,
      });

      const replyMessage = "Please enter your registered mobile number.";

      return createResult(
        replyMessage,
        ConversationState.WAITING_REGISTERED_MOBILE,
        context.data,
        false
      );
    }

    // Check if this is the initial photo decision for the first issue
    const isFirstPhotoDec = issueIndex === 0 && !selectedIssues[issueIndex].photoUrls;

    // Handle "Yes" option - transition to photo upload
    if (message === "1" || message === "yes") {
      logger.info({
        service: "PhotoHandler",
        action: "handle",
        event: "USER_CHOICE",
        sessionId: context.session.id,
        choice: "UPLOAD_PHOTOS",
        issueIndex,
        issueName: selectedIssues[issueIndex].issueCategoryName,
      });

      const replyMessage = buildPhotoUploadPrompt();

      // Store photoUrls array (initially empty, will be populated in WAITING_PHOTO_UPLOAD)
      const updatedIssues = this.initializePhotoArray(selectedIssues, issueIndex);
      const updatedData = {
        ...context.data,
        selectedIssues: updatedIssues,
      };

      return createResult(
        replyMessage,
        ConversationState.WAITING_PHOTO_UPLOAD,
        updatedData,
        false
      );
    }

    // Handle "Skip" option
    if (message === "2" || message === "skip") {
      logger.info({
        service: "PhotoHandler",
        action: "handle",
        event: LogEvent.PHOTO_SKIPPED,
        sessionId: context.session.id,
        issueIndex,
        issueName: selectedIssues[issueIndex].issueCategoryName,
      });

      // Initialize empty photoUrls array to mark this issue as "skipped"
      const updatedIssues = this.initializePhotoArray(selectedIssues, issueIndex);
      const updatedData = {
        ...context.data,
        selectedIssues: updatedIssues,
      };

      // Check if there's another issue needing photo decision
      const nextIssueIndex = this.findIssueNeedingPhotoDecision(updatedIssues);

      if (nextIssueIndex === -1) {
        // All issues have photo decisions - transition to mobile
        logger.info({
          service: "PhotoHandler",
          action: "handle",
          event: "ALL_PHOTO_DECISIONS_COMPLETE",
          sessionId: context.session.id,
          totalIssues: updatedIssues.length,
        });

        const replyMessage = "Please enter your registered mobile number.";

        return createResult(
          replyMessage,
          ConversationState.WAITING_REGISTERED_MOBILE,
          updatedData,
          false
        );
      }

      // More issues need photo decisions
      const nextIssue = updatedIssues[nextIssueIndex];
      const photoMenu = buildPhotoMenuForIssue(nextIssue.issueCategoryName);
      const replyMessage = `Got it.\n\n${photoMenu}`;

      return createResult(replyMessage, ConversationState.WAITING_PHOTO, updatedData, false);
    }

    // Invalid selection
    logger.info({
      service: "PhotoHandler",
      action: "handle",
      event: "INVALID_SELECTION",
      sessionId: context.session.id,
      invalidInput: message,
    });

    const menu = isFirstPhotoDec ? buildPhotoMenu() : buildPhotoMenuForIssue(selectedIssues[issueIndex].issueCategoryName);
    const replyMessage = `I didn't understand that.\n\n${menu}`;

    return createResult(replyMessage, ConversationState.WAITING_PHOTO, context.data, false);
  }

  /**
   * Find the first issue that hasn't made a photo decision yet.
   * Returns -1 if all issues have decisions.
   */
  private findIssueNeedingPhotoDecision(issues: SelectedIssue[]): number {
    return issues.findIndex((issue) => !Array.isArray(issue.photoUrls));
  }

  /**
   * Initialize photoUrls array for an issue.
   * Creates a copy and initializes the array at the specified index.
   */
  private initializePhotoArray(issues: SelectedIssue[], issueIndex: number): SelectedIssue[] {
    const updated = [...issues];
    updated[issueIndex] = {
      ...updated[issueIndex],
      photoUrls: [],
    };
    return updated;
  }
}
