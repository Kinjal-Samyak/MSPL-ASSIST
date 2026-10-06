import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";

/**
 * RegisterServiceHandler processes the REGISTER_SERVICE conversation state.
 *
 * Current implementation: Placeholder
 *
 * Future implementation will handle:
 * - Issue category selection
 * - Issue description
 * - Photo upload (optional)
 * - Mobile verification
 * - Customer lookup
 * - Deployment verification
 * - Ticket creation
 *
 * Does NOT (currently):
 * - Access database
 * - Create tickets
 * - Perform any operations
 */
export class RegisterServiceHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    logger.info({
      service: "RegisterServiceHandler",
      action: "handle",
      event: LogEvent.STATE_CHANGED,
      sessionId: context.session.id,
      nextState: ConversationState.REGISTER_SERVICE,
    });

    const replyMessage = "Register Service flow will be implemented in the next milestone.";

    return createResult(replyMessage, ConversationState.MAIN_MENU, context.data, false);
  }
}
