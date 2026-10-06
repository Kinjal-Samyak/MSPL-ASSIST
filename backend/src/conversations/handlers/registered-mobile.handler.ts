import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { RegisteredMobileValidator } from "../../validators/registered-mobile.validator";
import type { RegisteredCustomer } from "../conversation-context";

/**
 * RegisteredMobileHandler collects and validates customer's registered mobile number.
 *
 * Responsibilities (ORCHESTRATION ONLY):
 * ✓ Read ConversationContext
 * ✓ Call RegisteredMobileValidator.validateAndNormalize()
 * ✓ Handle validation result (success or failure)
 * ✓ Update registeredCustomer in context
 * ✓ Return ConversationResult
 * ✓ Transition to VERIFYING_CUSTOMER
 *
 * Handler must NOT contain:
 * ✗ String replacements (spaces, country code, trunk prefix removal)
 * ✗ Regex patterns
 * ✗ Length validation
 * ✗ Format validation
 *
 * All normalization and validation is delegated to RegisteredMobileValidator.
 *
 * Current state: WAITING_REGISTERED_MOBILE
 * Input: Customer mobile number (raw, various formats)
 * Output: ConversationResult with registeredCustomer object stored
 * Next state (success): VERIFYING_CUSTOMER
 * Next state (failure): WAITING_REGISTERED_MOBILE (stay)
 *
 * Note: This handler only collects and validates the mobile number.
 * Customer verification (lookup, deployment check) is handled by
 * ConversationService in the VERIFYING_CUSTOMER state (next milestone).
 *
 * Architecture:
 * ConversationService → [load master data] → ConversationContext
 *     ↓
 * ConversationEngine → StateHandlerFactory → RegisteredMobileHandler
 *     ↓
 * RegisteredMobileValidator → pure normalization & validation
 *     ↓
 * ConversationResult → [handler returns, service persists]
 */
export class RegisteredMobileHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    try {
      const input = context.request.message;

      logger.info({
        service: "RegisteredMobileHandler",
        action: "handle",
        event: LogEvent.MOBILE_RECEIVED,
        sessionId: context.session.id,
        inputLength: input.length,
      });

      // Delegate ALL normalization and validation to validator
      const validationResult = RegisteredMobileValidator.validateAndNormalize(input);

      // If validation failed, return error response
      if (!validationResult.isValid) {
        return this.createValidationErrorResponse(context, validationResult.errorMessage);
      }

      // Validation succeeded - log and create success response
      logger.info({
        service: "RegisteredMobileHandler",
        action: "handle",
        event: LogEvent.MOBILE_NORMALIZED,
        sessionId: context.session.id,
        normalizedLength: validationResult.value?.length ?? 0,
      });

      return this.createSuccessResponse(context, validationResult.value!);
    } catch (error) {
      // Handle unexpected errors (non-validation errors)
      logger.error({
        service: "RegisteredMobileHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
        sessionId: context.session.id,
      });

      throw error;
    }
  }

  /**
   * Creates validation error response.
   * Stays in WAITING_REGISTERED_MOBILE state.
   * Preserves all existing conversation data.
   *
   * @param context Current conversation context
   * @param errorMessage User-friendly error message from validator
   * @returns ConversationResult with validation error message
   */
  private createValidationErrorResponse(
    context: ConversationContext,
    errorMessage?: string
  ): ConversationResult {
    const message =
      errorMessage ||
      "Please enter a valid 10-digit registered mobile number.\n\nExamples:\n9876543210\n+91 9876543210";

    logger.info({
      service: "RegisteredMobileHandler",
      action: "createValidationErrorResponse",
      event: LogEvent.VALIDATION_FAILED,
      sessionId: context.session.id,
    });

    return createResult(message, ConversationState.WAITING_REGISTERED_MOBILE, context.data, false);
  }

  /**
   * Creates success response after mobile validation.
   * Transitions to VERIFYING_CUSTOMER state.
   * Creates RegisteredCustomer object with normalized mobile.
   * Preserves all existing conversation data (selectedIssues, photos, descriptions, etc.).
   *
   * @param context Current conversation context
   * @param normalizedMobile Validated and normalized 10-digit mobile number
   * @returns ConversationResult with success message and updated context
   */
  private createSuccessResponse(
    context: ConversationContext,
    normalizedMobile: string
  ): ConversationResult {
    // Create RegisteredCustomer object with mobile and verification status
    const registeredCustomer: RegisteredCustomer = {
      mobile: normalizedMobile,
      verified: false, // Not yet verified (happens in VERIFYING_CUSTOMER state)
    };

    // Merge new customer data with existing context (using spread operator)
    const updatedData = {
      ...context.data,
      registeredCustomer,
    };

    logger.info({
      service: "RegisteredMobileHandler",
      action: "createSuccessResponse",
      event: LogEvent.STATE_CHANGED,
      sessionId: context.session.id,
      from: context.currentState,
      to: ConversationState.VERIFYING_CUSTOMER,
      reason: "Mobile number validated successfully",
    });

    logger.info({
      service: "RegisteredMobileHandler",
      action: "createSuccessResponse",
      event: LogEvent.CONTEXT_UPDATED,
      sessionId: context.session.id,
      fieldUpdated: "registeredCustomer",
    });

    return createResult(
      "Thank you.\n\nVerifying your registered mobile number...",
      ConversationState.VERIFYING_CUSTOMER,
      updatedData,
      false
    );
  }
}
