import { ApplicationError } from "../errors";
import type { ConversationContext } from "./engine-context";
import type { ConversationResult } from "./conversation-result";
import { StateHandlerFactory } from "./state-handler.factory";
import { logger } from "../utils/logger";
import { LogEvent } from "../shared/log-event";

/**
 * ConversationEngine is the core orchestration component for conversation flow.
 *
 * Responsibilities:
 * - Receive a ConversationContext
 * - Resolve the appropriate handler for the current state
 * - Execute the handler
 * - Return a ConversationResult
 *
 * Non-Responsibilities (strictly forbidden):
 * - No Prisma database access
 * - No repository calls
 * - No ticket creation
 * - No session updates
 * - No business logic (only orchestration)
 *
 * The engine is a pure orchestrator that delegates to state handlers.
 * All side effects (persistence) happen outside this class.
 */
export class ConversationEngine {
  /**
   * Process a conversation at its current state.
   *
   * @param context - The conversation context (contains session, request, state, data)
   * @returns A result with reply message and next state
   * @throws ApplicationError if handler resolution or execution fails
   */
  async process(context: ConversationContext): Promise<ConversationResult> {
    logger.info({
      service: "ConversationEngine",
      action: "process",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      currentState: context.currentState,
      whatsappNumber: context.session.whatsappNumber,
    });

    try {
      // Resolve the handler for the current state
      const handler = StateHandlerFactory.resolve(context.currentState);

      // Execute the handler
      logger.info({
        service: "ConversationEngine",
        action: "process",
        event: "HANDLER_EXECUTING",
        sessionId: context.session.id,
        currentState: context.currentState,
        handlerClass: handler.constructor.name,
      });

      const result = await handler.handle(context);

      // Log state transition
      logger.info({
        service: "ConversationEngine",
        action: "process",
        event: LogEvent.STATE_CHANGED,
        sessionId: context.session.id,
        previousState: context.currentState,
        nextState: result.nextState,
        isConversationComplete: result.isConversationComplete,
      });

      return result;
    } catch (error) {
      logger.error({
        service: "ConversationEngine",
        action: "process",
        event: LogEvent.OPERATION_FAILED,
        sessionId: context.session.id,
        currentState: context.currentState,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError("Failed to process conversation.");
    }
  }
}
