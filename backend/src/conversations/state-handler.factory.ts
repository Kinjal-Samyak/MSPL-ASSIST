import { ApplicationError } from "../errors";
import { ConversationState } from "./conversation.state";
import type { ConversationStateHandler } from "./conversation-state-handler";
import { MainMenuHandler } from "./handlers/main-menu.handler";
import { RegisterServiceHandler } from "./handlers/register-service.handler";
import { TrackTicketHandler } from "./handlers/track-ticket.handler";
import { IssueCategoryHandler } from "./handlers/issue-category.handler";
import { AddMoreIssuesHandler } from "./handlers/add-more-issues.handler";
import { IssueDescriptionHandler } from "./handlers/issue-description.handler";
import { PhotoHandler } from "./handlers/photo.handler";
import { PhotoUploadHandler } from "./handlers/photo-upload.handler";
import { RegisteredMobileHandler } from "./handlers/registered-mobile.handler";
import { CustomerVerificationHandler } from "./handlers/customer-verification.handler";
import { DeploymentVerificationHandler } from "./handlers/deployment-verification.handler";
import { TicketCreationHandler } from "./handlers/ticket-creation.handler";
import { ConfirmationHandler } from "./handlers/confirmation.handler";
import { logger } from "../utils/logger";
import { LogEvent } from "../shared/log-event";

/**
 * StateHandlerFactory is responsible for resolving the correct handler
 * for a given conversation state.
 *
 * Currently supports:
 * - MAIN_MENU → MainMenuHandler
 * - REGISTER_SERVICE → RegisterServiceHandler
 * - TRACK_TICKET → TrackTicketHandler
 * - WAITING_ISSUE_CATEGORY → IssueCategoryHandler
 * - WAITING_ADD_MORE_ISSUES → AddMoreIssuesHandler
 * - WAITING_ISSUE_DESCRIPTION → IssueDescriptionHandler
 * - WAITING_PHOTO → PhotoHandler
 * - WAITING_PHOTO_UPLOAD → PhotoUploadHandler
 * - WAITING_REGISTERED_MOBILE → RegisteredMobileHandler
 * - VERIFYING_CUSTOMER → CustomerVerificationHandler
 * - VERIFYING_DEPLOYMENT → DeploymentVerificationHandler
 * - WAITING_TICKET_CREATION → TicketCreationHandler
 * - CONFIRMATION → ConfirmationHandler
 *
 * As new states are introduced, add them here to avoid a large switch statement.
 * Each handler is instantiated once and cached for reuse.
 */
export class StateHandlerFactory {
  private static handlers: Map<ConversationState, ConversationStateHandler> = new Map();

  static {
    // Initialize handlers
    StateHandlerFactory.handlers.set(ConversationState.MAIN_MENU, new MainMenuHandler());
    StateHandlerFactory.handlers.set(ConversationState.REGISTER_SERVICE, new RegisterServiceHandler());
    StateHandlerFactory.handlers.set(ConversationState.TRACK_TICKET, new TrackTicketHandler());
    StateHandlerFactory.handlers.set(
      ConversationState.WAITING_ISSUE_CATEGORY,
      new IssueCategoryHandler()
    );
    StateHandlerFactory.handlers.set(
      ConversationState.WAITING_ADD_MORE_ISSUES,
      new AddMoreIssuesHandler()
    );
    StateHandlerFactory.handlers.set(
      ConversationState.WAITING_ISSUE_DESCRIPTION,
      new IssueDescriptionHandler()
    );
    StateHandlerFactory.handlers.set(ConversationState.WAITING_PHOTO, new PhotoHandler());
    StateHandlerFactory.handlers.set(ConversationState.WAITING_PHOTO_UPLOAD, new PhotoUploadHandler());
    StateHandlerFactory.handlers.set(
      ConversationState.WAITING_REGISTERED_MOBILE,
      new RegisteredMobileHandler()
    );
    StateHandlerFactory.handlers.set(
      ConversationState.VERIFYING_CUSTOMER,
      new CustomerVerificationHandler()
    );
    StateHandlerFactory.handlers.set(
      ConversationState.VERIFYING_DEPLOYMENT,
      new DeploymentVerificationHandler()
    );
    StateHandlerFactory.handlers.set(
      ConversationState.WAITING_TICKET_CREATION,
      new TicketCreationHandler()
    );
    StateHandlerFactory.handlers.set(ConversationState.CONFIRMATION, new ConfirmationHandler());
  }

  /**
   * Resolve a handler for the given state.
   *
   * @param state - The current conversation state
   * @returns The handler for this state
   * @throws ApplicationError if no handler exists for the state
   */
  static resolve(state: ConversationState): ConversationStateHandler {
    const handler = StateHandlerFactory.handlers.get(state);

    if (!handler) {
      logger.error({
        service: "StateHandlerFactory",
        action: "resolve",
        event: LogEvent.OPERATION_FAILED,
        state,
        message: `No handler registered for state: ${state}`,
      });

      throw new ApplicationError(`No handler registered for conversation state: ${state}`);
    }

    logger.info({
      service: "StateHandlerFactory",
      action: "resolve",
      event: "HANDLER_RESOLVED",
      state,
      handlerClass: handler.constructor.name,
    });

    return handler;
  }

  /**
   * Register a custom handler for a state.
   * Useful for testing or extending with new states.
   *
   * @param state - The conversation state
   * @param handler - The handler implementation
   */
  static register(state: ConversationState, handler: ConversationStateHandler): void {
    StateHandlerFactory.handlers.set(state, handler);

    logger.info({
      service: "StateHandlerFactory",
      action: "register",
      event: "HANDLER_REGISTERED",
      state,
      handlerClass: handler.constructor.name,
    });
  }
}
