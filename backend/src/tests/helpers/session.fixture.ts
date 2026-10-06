import { ConversationState } from "../../conversations/conversation.state";

export function buildConversationSession(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    id: "session-1",
    whatsappNumber: "919999111222",
    customerId: null,
    currentTicketId: null,
    currentState: ConversationState.MAIN_MENU,
    conversationData: {},
    lastInteractionAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
