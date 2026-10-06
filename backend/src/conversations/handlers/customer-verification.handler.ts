import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { ApplicationError } from "../../errors";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { CustomerService } from "../../services/customer.service";
import type { RegisteredCustomer } from "../conversation-context";

/**
 * CustomerVerificationHandler verifies that a registered mobile number belongs to an existing customer.
 *
 * This is the first handler that interacts with the business layer (CustomerService).
 *
 * Responsibilities (ORCHESTRATION WITH SERVICE LAYER):
 * ✓ Read registeredCustomer.mobile from ConversationContext
 * ✓ Call CustomerService.findByRegisteredMobile()
 * ✓ Handle customer found: Update registeredCustomer, transition to VERIFYING_DEPLOYMENT
 * ✓ Handle customer not found: Stay in VERIFYING_CUSTOMER, return error message
 * ✓ Handle service error: Log and re-throw as ApplicationError
 * ✓ Return ConversationResult
 *
 * Handler must NOT:
 * ✗ Access repositories directly
 * ✗ Access Prisma
 * ✗ Create/update tickets
 * ✗ Verify deployments (separate handler)
 * ✗ Perform database mutations
 *
 * All business logic is owned by CustomerService.
 * Handler only orchestrates the conversation flow based on service results.
 *
 * Architecture:
 * ConversationEngine
 *     ↓
 * CustomerVerificationHandler (orchestration)
 *     ↓
 * CustomerService (business logic)
 *     ↓
 * MasterRepository (data access)
 *     ↓
 * Prisma Client
 *
 * State transitions:
 * - Customer found: VERIFYING_CUSTOMER → VERIFYING_DEPLOYMENT
 * - Customer not found: VERIFYING_CUSTOMER → VERIFYING_CUSTOMER (stay)
 * - Service error: Throws ApplicationError
 *
 * Current state: VERIFYING_CUSTOMER
 * Input: registeredCustomer.mobile from context
 * Output: ConversationResult with updated registeredCustomer or error
 * Next state (success): VERIFYING_DEPLOYMENT
 * Next state (failure): VERIFYING_CUSTOMER (retry)
 */
export class CustomerVerificationHandler implements ConversationStateHandler {
  private readonly customerService: CustomerService;

  constructor(customerService?: CustomerService) {
    this.customerService = customerService ?? new CustomerService();
  }

  async handle(context: ConversationContext): Promise<ConversationResult> {
    try {
      // Extract registered mobile from context
      const registeredCustomer = context.data.registeredCustomer;

      if (!registeredCustomer || !registeredCustomer.mobile) {
        logger.error({
          service: "CustomerVerificationHandler",
          action: "handle",
          event: LogEvent.OPERATION_FAILED,
          sessionId: context.session.id,
          reason: "No registered mobile in context",
        });

        throw new ApplicationError("Registered mobile number not found in conversation context");
      }

      const mobile = registeredCustomer.mobile;

      logger.info({
        service: "CustomerVerificationHandler",
        action: "handle",
        event: "CUSTOMER_LOOKUP_STARTED",
        sessionId: context.session.id,
        mobile: mobile.substring(0, 4) + "****" + mobile.substring(8), // Mask for privacy
      });

      // Call CustomerService to look up customer
      const customer = await this.customerService.findByRegisteredMobile(mobile);

      // If customer found, transition to VERIFYING_DEPLOYMENT
      if (customer) {
        return this.createSuccessResponse(context, registeredCustomer, customer);
      }

      // Customer not found - stay in VERIFYING_CUSTOMER
      return this.createNotFoundResponse(context);
    } catch (error) {
      // Handle unexpected errors (service failures, database errors, etc.)
      logger.error({
        service: "CustomerVerificationHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Creates success response when customer is found.
   * Updates registeredCustomer with customerId, customerName, and verified=true.
   * Transitions to VERIFYING_DEPLOYMENT state.
   *
   * @param context Current conversation context
   * @param registeredCustomer Current registered customer object
   * @param customer Customer record from database
   * @returns ConversationResult with updated context and next state
   */
  private createSuccessResponse(
    context: ConversationContext,
    registeredCustomer: RegisteredCustomer,
    customer: any // Prisma Customer type
  ): ConversationResult {
    // Update registeredCustomer object with customer details
    const updatedCustomer: RegisteredCustomer = {
      ...registeredCustomer,
      customerId: customer.id,
      customerName: customer.name,
      verified: true,
    };

    // Merge with existing context data
    const updatedData = {
      ...context.data,
      registeredCustomer: updatedCustomer,
    };

    const replyMessage = `Welcome ${customer.name}.\n\nYour mobile number has been verified.\n\nNow verifying your active vehicle...`;

    logger.info({
      service: "CustomerVerificationHandler",
      action: "createSuccessResponse",
      event: LogEvent.STATE_CHANGED,
      sessionId: context.session.id,
      from: context.currentState,
      to: ConversationState.VERIFYING_DEPLOYMENT,
      customerId: customer.id,
    });

    logger.info({
      service: "CustomerVerificationHandler",
      action: "createSuccessResponse",
      event: LogEvent.CONTEXT_UPDATED,
      sessionId: context.session.id,
      fieldsUpdated: "registeredCustomer.customerId, registeredCustomer.customerName, registeredCustomer.verified",
    });

    return createResult(
      replyMessage,
      ConversationState.VERIFYING_DEPLOYMENT,
      updatedData,
      false
    );
  }

  /**
   * Creates error response when customer is not found.
   * Stays in VERIFYING_CUSTOMER state.
   * Preserves all existing context data.
   *
   * @param context Current conversation context
   * @returns ConversationResult with error message, same state
   */
  private createNotFoundResponse(context: ConversationContext): ConversationResult {
    const replyMessage =
      "We could not find a rider registered with this phone number.\n\nPlease check the number and try again.\n\nIf the problem continues, please contact MSPL Support.";

    logger.info({
      service: "CustomerVerificationHandler",
      action: "createNotFoundResponse",
      event: LogEvent.CUSTOMER_LOOKUP_FAILED,
      sessionId: context.session.id,
      reason: "Customer not found - staying in VERIFYING_CUSTOMER",
    });

    return createResult(
      replyMessage,
      ConversationState.VERIFYING_CUSTOMER,
      context.data,
      false
    );
  }
}
