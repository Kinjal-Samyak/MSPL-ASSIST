import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { ApplicationError } from "../../errors";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { DeploymentService } from "../../services/deployment.service";
import type { VerifiedDeployment } from "../conversation-context";

/**
 * DeploymentVerificationHandler verifies that a customer has an active rental/deployment.
 *
 * This handler integrates with the DeploymentService to find active vehicles rented by the customer.
 *
 * Responsibilities (ORCHESTRATION WITH SERVICE LAYER):
 * ✓ Read registeredCustomer.customerId from ConversationContext
 * ✓ Call DeploymentService.getActiveDeployment()
 * ✓ Handle deployment found: Update activeDeployment, transition to REVIEW_TICKET
 * ✓ Handle deployment not found: Stay in VERIFYING_DEPLOYMENT, return error message
 * ✓ Handle service error: Log and re-throw as ApplicationError
 * ✓ Return ConversationResult
 *
 * Handler must NOT:
 * ✗ Access repositories directly
 * ✗ Access Prisma
 * ✗ Create/update tickets
 * ✗ Modify deployment data
 * ✗ Perform database mutations
 *
 * All business logic is owned by DeploymentService.
 * Handler only orchestrates the conversation flow based on service results.
 *
 * Architecture:
 * ConversationEngine
 *     ↓
 * DeploymentVerificationHandler (orchestration)
 *     ↓
 * DeploymentService (business logic)
 *     ↓
 * MasterRepository (data access)
 *     ↓
 * Prisma Client
 *
 * State transitions:
 * - Deployment found: VERIFYING_DEPLOYMENT → REVIEW_TICKET
 * - Deployment not found: VERIFYING_DEPLOYMENT → VERIFYING_DEPLOYMENT (stay)
 * - Service error: Throws ApplicationError
 *
 * Current state: VERIFYING_DEPLOYMENT
 * Input: registeredCustomer.customerId from context
 * Output: ConversationResult with activeDeployment or error
 * Next state (success): REVIEW_TICKET
 * Next state (failure): VERIFYING_DEPLOYMENT (retry)
 */
export class DeploymentVerificationHandler implements ConversationStateHandler {
  private readonly deploymentService: DeploymentService;

  constructor(deploymentService?: DeploymentService) {
    this.deploymentService = deploymentService ?? new DeploymentService();
  }

  async handle(context: ConversationContext): Promise<ConversationResult> {
    try {
      // Extract customer ID from context
      const registeredCustomer = context.data.registeredCustomer;

      if (!registeredCustomer || !registeredCustomer.customerId) {
        logger.error({
          service: "DeploymentVerificationHandler",
          action: "handle",
          event: LogEvent.OPERATION_FAILED,
          sessionId: context.session.id,
          reason: "No customer ID in context",
        });

        throw new ApplicationError("Rider ID not found in conversation context");
      }

      const customerId = registeredCustomer.customerId;

      logger.info({
        service: "DeploymentVerificationHandler",
        action: "handle",
        event: "DEPLOYMENT_LOOKUP_STARTED",
        sessionId: context.session.id,
        customerId,
      });

      // Call DeploymentService to find active deployment
      const activeDeployment = await this.deploymentService.getActiveDeployment(customerId);

      // If deployment found, transition to REVIEW_TICKET
      if (activeDeployment) {
        return this.createSuccessResponse(context, activeDeployment);
      }

      // Deployment not found - stay in VERIFYING_DEPLOYMENT
      return this.createNotFoundResponse(context);
    } catch (error) {
      // Handle unexpected errors (service failures, database errors, etc.)
      logger.error({
        service: "DeploymentVerificationHandler",
        action: "handle",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Creates success response when active deployment is found.
   * Stores activeDeployment in context.
   * Transitions to REVIEW_TICKET state.
   *
   * @param context Current conversation context
   * @param activeDeployment Verified active deployment
   * @returns ConversationResult with updated context and next state
   */
  private createSuccessResponse(
    context: ConversationContext,
    activeDeployment: VerifiedDeployment
  ): ConversationResult {
    // Merge with existing context data
    const updatedData = {
      ...context.data,
      activeDeployment,
    };

    const replyMessage = `Vehicle verified successfully.

Vehicle Number: ${activeDeployment.vehicleNumber}

Model: ${activeDeployment.vehicleModel}

Hub: ${activeDeployment.hubName}

Preparing your service request...`;

    logger.info({
      service: "DeploymentVerificationHandler",
      action: "createSuccessResponse",
      event: LogEvent.STATE_CHANGED,
      sessionId: context.session.id,
      from: context.currentState,
      to: ConversationState.REVIEW_TICKET,
      deploymentId: activeDeployment.deploymentId,
    });

    logger.info({
      service: "DeploymentVerificationHandler",
      action: "createSuccessResponse",
      event: LogEvent.CONTEXT_UPDATED,
      sessionId: context.session.id,
      fieldUpdated: "activeDeployment",
    });

    return createResult(
      replyMessage,
      ConversationState.REVIEW_TICKET,
      updatedData,
      false
    );
  }

  /**
   * Creates error response when no active deployment is found.
   * Stays in VERIFYING_DEPLOYMENT state.
   * Preserves all existing context data.
   *
   * @param context Current conversation context
   * @returns ConversationResult with error message, same state
   */
  private createNotFoundResponse(context: ConversationContext): ConversationResult {
    const replyMessage =
      "We could not find an active rented vehicle linked to your account.\n\nPlease contact your coordinator if you believe this is incorrect.";

    logger.info({
      service: "DeploymentVerificationHandler",
      action: "createNotFoundResponse",
      event: LogEvent.DEPLOYMENT_LOOKUP_FAILED,
      sessionId: context.session.id,
      reason: "No active deployment found - staying in VERIFYING_DEPLOYMENT",
    });

    return createResult(
      replyMessage,
      ConversationState.VERIFYING_DEPLOYMENT,
      context.data,
      false
    );
  }
}
