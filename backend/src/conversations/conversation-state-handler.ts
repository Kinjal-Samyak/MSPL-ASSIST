import type { ConversationContext } from "./engine-context";
import type { ConversationResult } from "./conversation-result";

/**
 * ConversationStateHandler is the core interface for the State Pattern.
 *
 * Every conversation state has a corresponding handler.
 * Handlers are stateless, pure functions that process a conversation context
 * and return a result.
 *
 * Handlers must:
 * - Never access Prisma or repositories
 * - Never perform database operations
 * - Never modify the input context
 * - Return a ConversationResult
 *
 * Examples:
 * - MainMenuHandler processes the MAIN_MENU state
 * - RegisterServiceHandler processes the REGISTER_SERVICE state
 * - TrackTicketHandler processes the TRACK_TICKET state
 */
export interface ConversationStateHandler {
  /**
   * Process the conversation at the current state.
   *
   * @param context - The current conversation context (immutable)
   * @returns A result containing the reply message and next state
   * @throws ValidationError if input is invalid
   * @throws ApplicationError if processing fails
   */
  handle(context: ConversationContext): Promise<ConversationResult>;
}
