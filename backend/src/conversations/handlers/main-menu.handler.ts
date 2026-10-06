import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { buildMainMenu, buildIssueCategoryMenu } from "../helpers/menu-builder";

/**
 * MainMenuHandler processes the MAIN_MENU conversation state.
 *
 * Pure processor that:
 * - Detects greeting messages (Hi, Hello, Menu, Start, Help)
 * - Detects menu selection (1=Register, 2=Track)
 * - Returns appropriate welcome message
 * - Transitions to next state based on selection
 *
 * No external dependencies:
 * - Does NOT inject services
 * - Does NOT query database
 * - Receives all needed data via ConversationContext.issueCategories
 */
export class MainMenuHandler implements ConversationStateHandler {
  async handle(context: ConversationContext): Promise<ConversationResult> {
    const message = context.request.message.trim().toLowerCase();

    logger.info({
      service: "MainMenuHandler",
      action: "handle",
      event: LogEvent.CONVERSATION_STARTED,
      sessionId: context.session.id,
      messageReceived: context.request.message,
    });

    // Detect greeting messages - display main menu
    const isGreeting =
      message === "hi" ||
      message === "hello" ||
      message === "menu" ||
      message === "start" ||
      message === "help";

    if (isGreeting) {
      const replyMessage = buildMainMenu();

      logger.info({
        service: "MainMenuHandler",
        action: "handle",
        event: "MENU_DISPLAYED",
        sessionId: context.session.id,
      });

      return createResult(replyMessage, ConversationState.MAIN_MENU, context.data, false);
    }

    // Detect menu selection: 1 or "Register"
    if (message === "1" || message === "register") {
      logger.info({
        service: "MainMenuHandler",
        action: "handle",
        event: "OPTION_SELECTED",
        sessionId: context.session.id,
        option: "REGISTER_SERVICE",
      });

      const categories = context.issueCategories ?? [];
      const categoryMenu = buildIssueCategoryMenu(categories);
      const replyMessage = `Great! Let's create your service request.\n\nPlease select your issue.\n\n${categoryMenu}`;

      return createResult(replyMessage, ConversationState.WAITING_ISSUE_CATEGORY, context.data, false);
    }

    // Detect menu selection: 2 or "Track"
    if (message === "2" || message === "track") {
      logger.info({
        service: "MainMenuHandler",
        action: "handle",
        event: "OPTION_SELECTED",
        sessionId: context.session.id,
        option: "TRACK_TICKET",
      });

      const replyMessage = "Track Ticket flow will be implemented in the next milestone.";

      return createResult(replyMessage, ConversationState.TRACK_TICKET, context.data, false);
    }

    // Invalid selection - ask again
    logger.info({
      service: "MainMenuHandler",
      action: "handle",
      event: "INVALID_SELECTION",
      sessionId: context.session.id,
      invalidInput: message,
    });

    const replyMessage = buildMainMenu();

    return createResult(replyMessage, ConversationState.MAIN_MENU, context.data, false);
  }
}
