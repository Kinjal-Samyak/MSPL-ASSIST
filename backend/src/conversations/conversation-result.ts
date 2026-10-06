import type { ConversationContextData } from "./conversation-context";
import { ConversationState } from "./conversation.state";

/**
 * ConversationResult represents the outcome of processing a message through a handler.
 *
 * It contains:
 * - The reply message to send to the customer
 * - The next state for the conversation
 * - Updated conversation data
 * - Whether the conversation is complete
 *
 * This is a pure data structure with no logic or side effects.
 */
export interface ConversationResult {
  /**
   * Message to send to the customer.
   * Must be non-empty and properly formatted.
   */
  replyMessage: string;

  /**
   * Next conversation state to transition to.
   */
  nextState: ConversationState;

  /**
   * Updated conversation data to persist.
   * Handler must return the complete updated data object.
   */
  updatedConversationData: ConversationContextData;

  /**
   * Whether the conversation has reached completion.
   * If true, session can be marked complete or cleaned up.
   */
  isConversationComplete: boolean;
}

export function createResult(
  replyMessage: string,
  nextState: ConversationState,
  updatedConversationData: ConversationContextData,
  isConversationComplete: boolean = false
): ConversationResult {
  if (!replyMessage || replyMessage.trim().length === 0) {
    throw new Error("replyMessage must be non-empty");
  }

  return {
    replyMessage,
    nextState,
    updatedConversationData,
    isConversationComplete,
  };
}
