import type { ConversationSessionDto, ConversationRequestDto } from "../dto/conversation.dto";
import type { ConversationContextData } from "./conversation-context";
import { ConversationState } from "./conversation.state";

/**
 * Represents a minimal issue category object passed to handlers.
 * Only contains what handlers need to display menus dynamically.
 */
export interface IssueCategory {
  id: string;
  name: string;
}

/**
 * ConversationContext represents the complete state of a conversation at a point in time.
 *
 * It is passed to handlers and contains all information needed to process a message
 * without accessing any external dependencies (Prisma, repositories, etc).
 *
 * Master data (issue categories, statuses, etc.) is pre-loaded by ConversationService
 * and included here so handlers remain pure processors without external dependencies.
 *
 * Immutability note: Context is passed by reference but handlers should not mutate it.
 */
export interface ConversationContext {
  /**
   * Current session information from database.
   */
  session: ConversationSessionDto;

  /**
   * Incoming request from WhatsApp.
   */
  request: ConversationRequestDto;

  /**
   * Current conversation data (progressive state through the flow).
   */
  data: ConversationContextData;

  /**
   * Current conversation state.
   */
  currentState: ConversationState;

  /**
   * Issue categories available for selection.
   * Pre-loaded by ConversationService so handlers don't need to query master data.
   */
  issueCategories?: IssueCategory[];
}

export function createContext(
  session: ConversationSessionDto,
  request: ConversationRequestDto,
  currentState: ConversationState,
  data?: ConversationContextData,
  issueCategories?: IssueCategory[]
): ConversationContext {
  return {
    session,
    request,
    data: data ?? {},
    currentState,
    issueCategories,
  };
}
