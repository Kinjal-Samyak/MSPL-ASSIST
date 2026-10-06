import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { buildPhotoMenu, buildPhotoMenuForIssue } from "../helpers/menu-builder";
import { ApplicationError } from "../../errors";
import type { SelectedIssue } from "../conversation-context";

/**
 * PhotoUploadHandler processes the WAITING_PHOTO_UPLOAD conversation state.
 *
 * Responsibilities:
 * - Collect photo placeholder references (PHOTO_001, PHOTO_002, etc.)
 * - Append each placeholder to selectedIssues[currentIssue].photoUrls
 * - Accept "DONE" command to finish photo collection for current issue
 * - Move to next issue's photo decision or transition to mobile
 * - Support unlimited photo placeholders per issue
 * - No actual image processing (placeholders only)
 *
 * Pure processor (no services, no database access, no image download/storage).
 */
export class PhotoUploadHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    const message = context.request.message.trim().toUpperCase();
    const selectedIssues = context.data.selectedIssues ?? [];

    logger.info({
      service: "PhotoUploadHandler",
      action: "handle",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      messageReceived: message,
      totalIssues: selectedIssues.length,
    });

    if (!selectedIssues || selectedIssues.length === 0) {
      logger.error({
        service: "PhotoUploadHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: "No selected issues in context",
      });

      throw new ApplicationError("No selected issues found.");
    }

    // Find the issue currently being processed for photos
    const issueIndex = this.findCurrentPhotoIssue(selectedIssues);

    if (issueIndex === -1) {
      logger.error({
        service: "PhotoUploadHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: "No issue currently being processed for photos",
      });

      throw new ApplicationError("No issue in photo upload mode.");
    }

    // Handle DONE command
    if (message === "DONE") {
      logger.info({
        service: "PhotoUploadHandler",
        action: "handle",
        event: LogEvent.PHOTO_COLLECTION_COMPLETED,
        sessionId: context.session.id,
        issueIndex,
        issueName: selectedIssues[issueIndex].issueCategoryName,
        photosCollected: selectedIssues[issueIndex].photoUrls?.length ?? 0,
      });

      // Check if there's another issue that needs photo decision
      const nextIssueIndex = this.findNextIssueNeedingPhotoDecision(selectedIssues, issueIndex);

      if (nextIssueIndex === -1) {
        // All issues done - transition to mobile
        const replyMessage = "Please enter your registered mobile number.";

        return createResult(
          replyMessage,
          ConversationState.WAITING_REGISTERED_MOBILE,
          context.data,
          false
        );
      }

      // Move to next issue's photo decision
      const nextIssue = selectedIssues[nextIssueIndex];
      const photoMenu = buildPhotoMenuForIssue(nextIssue.issueCategoryName);
      const replyMessage = `Got it.\n\n${photoMenu}`;

      return createResult(replyMessage, ConversationState.WAITING_PHOTO, context.data, false);
    }

    // Accept photo placeholders (PHOTO_XXX format)
    if (this.isValidPhotoPlaceholder(message)) {
      logger.info({
        service: "PhotoUploadHandler",
        action: "handle",
        event: LogEvent.PHOTO_PLACEHOLDER_RECEIVED,
        sessionId: context.session.id,
        issueIndex,
        placeholder: message,
        currentPhotoCount: selectedIssues[issueIndex].photoUrls?.length ?? 0,
      });

      // Append placeholder to current issue
      const updatedIssues = this.appendPhotoPlaceholder(selectedIssues, issueIndex, message);

      const updatedData = {
        ...context.data,
        selectedIssues: updatedIssues,
      };

      const photoCount = updatedIssues[issueIndex].photoUrls?.length ?? 0;
      const replyMessage = `Got it! (${photoCount} photo${photoCount !== 1 ? "s" : ""} so far)\n\nUpload more or type DONE when finished.`;

      return createResult(replyMessage, ConversationState.WAITING_PHOTO_UPLOAD, updatedData, false);
    }

    // Invalid input
    logger.info({
      service: "PhotoUploadHandler",
      action: "handle",
      event: "INVALID_SELECTION",
      sessionId: context.session.id,
      invalidInput: message,
    });

    const replyMessage = `Please upload a photo (e.g., PHOTO_001) or type DONE when finished.`;

    return createResult(replyMessage, ConversationState.WAITING_PHOTO_UPLOAD, context.data, false);
  }

  /**
   * Find the index of the issue currently being processed for photos.
   * Returns -1 if none found (shouldn't happen in normal flow).
   */
  private findCurrentPhotoIssue(issues: SelectedIssue[]): number {
    return issues.findIndex((issue) => Array.isArray(issue.photoUrls) && !issue.photoUrls);
  }

  /**
   * Find the next issue after the current one that needs photo decision.
   * Returns -1 if no more issues need decision.
   */
  private findNextIssueNeedingPhotoDecision(
    issues: SelectedIssue[],
    currentIndex: number
  ): number {
    for (let i = currentIndex + 1; i < issues.length; i++) {
      if (!Array.isArray(issues[i].photoUrls)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if input matches photo placeholder pattern.
   * Accepts: PHOTO_001, PHOTO_002, etc.
   */
  private isValidPhotoPlaceholder(input: string): boolean {
    // Simple pattern: PHOTO_ followed by anything
    // This is flexible enough for future variations
    return /^PHOTO_\d+$/.test(input) || /^PHOTO[_-]?\w+$/.test(input);
  }

  /**
   * Append a photo placeholder to the current issue's photoUrls array.
   * Preserves existing photos.
   */
  private appendPhotoPlaceholder(
    issues: SelectedIssue[],
    issueIndex: number,
    placeholder: string
  ): SelectedIssue[] {
    const updated = [...issues];
    const currentPhotos = updated[issueIndex].photoUrls ?? [];

    updated[issueIndex] = {
      ...updated[issueIndex],
      photoUrls: [...currentPhotos, placeholder],
    };

    return updated;
  }
}
