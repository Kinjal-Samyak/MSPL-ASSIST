import type { ConversationContextData } from "../conversation-context";
import { ApplicationError } from "../../errors";
import { logger } from "../../utils/logger";

/**
 * Represents the confirmation view model with formatted data for display.
 */
export interface ConfirmationViewModel {
  ticketNumber: string;
  customerName: string;
  vehicleNumber: string;
  vehicleModel: string;
  hubName: string;
  issueCount: number;
  status: string;
  createdAt: string;
}

/**
 * ConfirmationMessageBuilder formats ticket confirmation messages.
 *
 * Responsibilities:
 * ✓ Extract ticket information from ConversationContextData
 * ✓ Build formatted confirmation message
 * ✓ Format customer information
 * ✓ Format vehicle information
 * ✓ Format issue count
 * ✓ Format timestamps
 *
 * Must NOT:
 * ✗ Call services or repositories
 * ✗ Access Prisma
 * ✗ Perform business logic
 * ✗ Send notifications
 *
 * Pure message formatting only.
 */
export class ConfirmationMessageBuilder {
  /**
   * Extract and format confirmation view model from context.
   *
   * @param contextData - Conversation context with all ticket data
   * @returns Formatted view model for confirmation message
   * @throws ApplicationError if required data is missing
   */
  static extractViewModel(contextData: ConversationContextData): ConfirmationViewModel {
    try {
      // Validate ticket exists
      if (!contextData.ticket) {
        throw new ApplicationError("Ticket information not found in context");
      }

      const { ticket } = contextData;

      // Validate customer info
      if (!contextData.registeredCustomer) {
        throw new ApplicationError("Customer information not found in context");
      }

      const { registeredCustomer } = contextData;
      if (!registeredCustomer.customerName) {
        throw new ApplicationError("Customer name not found in context");
      }

      // Validate deployment/vehicle info
      if (!contextData.activeDeployment) {
        throw new ApplicationError("Vehicle information not found in context");
      }

      const { activeDeployment } = contextData;

      // Validate issues
      if (!contextData.selectedIssues || contextData.selectedIssues.length === 0) {
        throw new ApplicationError("Issues not found in context");
      }

      const issueCount = contextData.selectedIssues.length;

      const viewModel: ConfirmationViewModel = {
        ticketNumber: ticket.ticketNumber,
        customerName: registeredCustomer.customerName,
        vehicleNumber: activeDeployment.vehicleNumber,
        vehicleModel: activeDeployment.vehicleModel,
        hubName: activeDeployment.hubName,
        issueCount,
        status: ticket.status,
        createdAt: this.formatDateTime(ticket.createdAt),
      };

      logger.info({
        service: "ConfirmationMessageBuilder",
        action: "extractViewModel",
        event: "VIEW_MODEL_EXTRACTED",
        ticketNumber: ticket.ticketNumber,
        issueCount,
        customerName: registeredCustomer.customerName,
      });

      return viewModel;
    } catch (error) {
      logger.error({
        service: "ConfirmationMessageBuilder",
        action: "extractViewModel",
        event: "EXTRACTION_FAILED",
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Build formatted confirmation message.
   *
   * Generates a user-friendly confirmation message with all ticket details
   * including ticket number, vehicle, issue count, status, and thank you message.
   *
   * @param viewModel - Formatted confirmation view model
   * @returns Formatted confirmation message string
   */
  static buildMessage(viewModel: ConfirmationViewModel): string {
    const message = [
      "✅ Your service request has been successfully registered.",
      "",
      "Ticket Number",
      viewModel.ticketNumber,
      "",
      "Vehicle",
      viewModel.vehicleNumber,
      "",
      "Model",
      viewModel.vehicleModel,
      "",
      "Hub",
      viewModel.hubName,
      "",
      "Issues Registered",
      String(viewModel.issueCount),
      "",
      "Current Status",
      viewModel.status,
      "",
      "Thank you for choosing MSPL Assist.",
      "You will receive future ticket updates on this WhatsApp number.",
    ].join("\n");

    logger.info({
      service: "ConfirmationMessageBuilder",
      action: "buildMessage",
      event: "MESSAGE_BUILT",
      ticketNumber: viewModel.ticketNumber,
      messageLength: message.length,
    });

    return message;
  }

  /**
   * Format ISO datetime string to readable format.
   *
   * Converts ISO 8601 timestamp to readable format for display.
   * Example: "2024-07-09T14:38:38.542Z" → "09 Jul 2024, 14:38"
   *
   * @param isoDateTime - ISO 8601 datetime string
   * @returns Formatted datetime string
   */
  private static formatDateTime(isoDateTime: string): string {
    try {
      const date = new Date(isoDateTime);

      if (isNaN(date.getTime())) {
        logger.info({
          service: "ConfirmationMessageBuilder",
          action: "formatDateTime",
          event: "INVALID_DATETIME",
          input: isoDateTime,
        });

        return isoDateTime; // Return original if invalid
      }

      // Format: "09 Jul 2024, 14:38"
      const options: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      return date.toLocaleDateString("en-IN", options);
    } catch (error) {
      logger.info({
        service: "ConfirmationMessageBuilder",
        action: "formatDateTime",
        event: "FORMAT_ERROR",
        error: error instanceof Error ? error.message : String(error),
      });

      return isoDateTime; // Return original on error
    }
  }
}
