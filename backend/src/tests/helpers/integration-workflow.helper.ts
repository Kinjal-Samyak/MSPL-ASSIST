import type { ConversationResult } from "../../conversations/conversation-result";
import type { ConversationContext } from "../../conversations/engine-context";

export function applyConversationResult(
  context: ConversationContext,
  result: ConversationResult,
  nextMessage: string
): ConversationContext {
  return {
    ...context,
    currentState: result.nextState,
    data: result.updatedConversationData,
    request: {
      ...context.request,
      message: nextMessage,
    },
  };
}
