import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { ApplicationError } from "../../errors";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import {
  ConfirmationMessageBuilder,
  type ConfirmationViewModel,
} from "../helpers/confirmation-message.builder";

/**
 * ConfirmationHandler generates and returns the final ticket confirmation message.
 *
 * This handler completes the customer conversation after a ticket has been successfully created.
 * It reads ticket details from the conversation context and builds a formatted confirmation
 * message that the customer will see on WhatsApp.
 *
 * Responsibilities (READ-ONLY ORCHESTRATION):
 * ✓ Read ConversationContext (ticket, customer, deployment, issues)
 * ✓ Validate required data exists
 * ✓ Call ConfirmationMessageBuilder to extract view model
 * ✓ Call ConfirmationMessageBuilder to format message
 * ✓ Mark conversation as complete
 * ✓ Transition to COMPLETED state
 * ✓ Return ConversationResult
 *
 * Handler must NOT:
 * ✗ Send notifications
 * ✗ Call WhatsApp API
 * ✗ Access services
 * ✗ Access repositories
 * ✗ Access Prisma
 * ✗ Modify database
 * ✗ Delete/archive sessions
 * ✗ Perform any side effects
 *
 * This is a pure read-only handler that only generates output.
 * The ConversationService will later handle session archiving/cleanup.
 *
 * Architecture:
 * ConversationEngine
 *     ↓
 * ConfirmationHandler (read-only orchestration)
 *     └─→ ConfirmationMessageBuilder (pure formatting)
 *
 * State transitions:
 * - Success: CONFIRMATION → COMPLETED (always, no branches)
 * - Error: Throws ApplicationError
 *
 * Current state: CONFIRMATION
 * Input: Full ConversationContext with ticket, customer, deployment, issues
 * Output: ConversationResult with formatted confirmation message
 * Next state: COMPLETED
 * Completion: isConversationComplete = true
 */
export class ConfirmationHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    try {
      // Log start of confirmation
      logger.info({
        service: "ConfirmationHandler",
        action: "handle",
        event: "CONFIRMATION_STARTED",
        sessionId: context.session.id,
      });

      // Validate required context data
      this.validateContextData(context);

      // Extract view model from context
      const viewModel = ConfirmationMessageBuilder.extractViewModel(context.data);

      // Build formatted confirmation message
      const confirmationMessage = ConfirmationMessageBuilder.buildMessage(viewModel);

      // Log confirmation generation
      logger.info({
        service: "ConfirmationHandler",
        action: "handle",
        event: "CONFIRMATION_GENERATED",
        sessionId: context.session.id,
        ticketNumber: viewModel.ticketNumber,
        customerName: viewModel.customerName,
      });

      // Log state transition
      logger.info({
        service: "ConfirmationHandler",
        action: "handle",
        event: LogEvent.STATE_CHANGED,
        sessionId: context.session.id,
        fromState: ConversationState.CONFIRMATION,
        toState: ConversationState.COMPLETED,
      });

      // Log conversation completion
      logger.info({
        service: "ConfirmationHandler",
        action: "handle",
        event: "CONVERSATION_COMPLETED",
        sessionId: context.session.id,
        ticketNumber: viewModel.ticketNumber,
        conversationDuration: "N/A", // Could be calculated from session metadata
      });

      // Return result with conversation complete flag set
      return createResult(
        confirmationMessage,
        ConversationState.COMPLETED,
        context.data,
        true // isConversationComplete = true
      );
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Validate that all required conversation data is present.
   *
   * Required:
   * - ticket with ticketNumber and status
   * - registeredCustomer with customerName
   * - activeDeployment with vehicleNumber and vehicleModel
   * - selectedIssues with at least one issue
   *
   * @throws ApplicationError if validation fails
   */
  private validateContextData(context: ConversationContext): void {
    const { data } = context;

    // Validate ticket exists
    if (!data.ticket) {
      throw new ApplicationError("Ticket information not found in conversation context");
    }

    const { ticket } = data;
    if (!ticket.ticketNumber || !ticket.status) {
      throw new ApplicationError("Ticket information incomplete in context");
    }

    // Validate customer
    if (!data.registeredCustomer) {
      throw new ApplicationError("Rider information not found in conversation context");
    }

    const { registeredCustomer } = data;
    if (!registeredCustomer.customerName) {
      throw new ApplicationError("Rider name not found in context");
    }

    // Validate deployment/vehicle
    if (!data.activeDeployment) {
      throw new ApplicationError("Vehicle information not found in conversation context");
    }

    const { activeDeployment } = data;
    if (!activeDeployment.vehicleNumber || !activeDeployment.vehicleModel) {
      throw new ApplicationError("Vehicle information incomplete in context");
    }

    // Validate issues
    if (!data.selectedIssues || data.selectedIssues.length === 0) {
      throw new ApplicationError("Issues not found in conversation context");
    }

    logger.info({
      service: "ConfirmationHandler",
      action: "validateContextData",
      event: "VALIDATION_SUCCESS",
      sessionId: context.session.id,
      ticketNumber: ticket.ticketNumber,
      issueCount: data.selectedIssues.length,
    });
  }

  /**
   * Handle errors during confirmation generation.
   *
   * Logs error and re-throws as ApplicationError.
   * Does not catch or suppress errors since confirmation is the final step.
   *
   * @param error - Error from validation or builder
   * @param context - Current conversation context
   * @throws ApplicationError always
   */
  private handleError(error: unknown, context: ConversationContext): ConversationResult {
    logger.error({
      service: "ConfirmationHandler",
      action: "handle",
      event: LogEvent.OPERATION_FAILED,
      sessionId: context.session.id,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    // Re-throw to let conversation engine handle escalation
    throw error;
  }
}
