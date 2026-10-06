import type { ConversationContextData } from "../../conversations/conversation-context";
import type { ConversationContext, IssueCategory } from "../../conversations/engine-context";
import { ConversationState } from "../../conversations/conversation.state";
import type { ConversationSessionDto } from "../../dto/conversation.dto";

export interface ConversationContextBuilderInput {
  state?: ConversationState;
  message?: string;
  data?: ConversationContextData;
  issueCategories?: IssueCategory[];
}

function buildSession(): ConversationSessionDto {
  return {
    id: "session-1",
    whatsappNumber: "919999888877",
    customerId: null,
    currentTicketId: null,
    currentState: ConversationState.MAIN_MENU,
    conversationData: {},
    lastInteractionAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildConversationContext(
  input: ConversationContextBuilderInput = {}
): ConversationContext {
  const session = buildSession();
  const state = input.state ?? ConversationState.MAIN_MENU;
  session.currentState = state;

  return {
    session,
    request: {
      whatsappNumber: session.whatsappNumber,
      message: input.message ?? "hello",
    },
    currentState: state,
    data: input.data ?? {},
    issueCategories: input.issueCategories ?? [
      { id: "issue-1", name: "Battery" },
      { id: "issue-2", name: "Brake" },
    ],
  };
}
