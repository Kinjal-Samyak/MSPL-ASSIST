import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";

/**
 * TrackTicketHandler processes the TRACK_TICKET conversation state.
 *
 * Current implementation: Placeholder
 *
 * Future implementation will handle:
 * - Ticket number input
 * - Mobile number verification
 * - Ticket lookup
 * - Status display
 * - Update notifications
 *
 * Does NOT (currently):
 * - Access database
 * - Lookup tickets
 * - Perform any operations
 */
export class TrackTicketHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    logger.info({
      service: "TrackTicketHandler",
      action: "handle",
      event: LogEvent.STATE_CHANGED,
      sessionId: context.session.id,
      nextState: ConversationState.TRACK_TICKET,
    });

    const replyMessage = "Track Ticket flow will be implemented in the next milestone.";

    return createResult(replyMessage, ConversationState.MAIN_MENU, context.data, false);
  }
}
