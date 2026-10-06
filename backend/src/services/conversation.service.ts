import type { ConversationSession } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prismaClient } from "../database";
import { ConversationRepository } from "../repositories/conversation.repository";
import { validateConversationRequest, detectCommand } from "../validators/conversation.validator";
import { ApplicationError } from "../errors";
import type {
  ConversationRequestDto,
  ConversationSessionDto,
  ConversationResponseDto,
} from "../dto/conversation.dto";
import { logger } from "../utils/logger";
import { ConversationState } from "../conversations/conversation.state";
import { ConversationCommand } from "../conversations/conversation.command";
import { LogEvent } from "../shared/log-event";
import type { ConversationContextData } from "../conversations/conversation-context";
import { createContext } from "../conversations/engine-context";
import type { ConversationContext } from "../conversations/engine-context";
import { ConversationEngine } from "../conversations/conversation.engine";
import { MasterService } from "./master.service";
import { config } from "../config";

export class ConversationService {
  private readonly repository: ConversationRepository;
  private readonly masterService: MasterService;
  private readonly engine: ConversationEngine;
  private readonly sessionTimeoutHours: number;

  constructor(
    repository?: ConversationRepository,
    masterService?: MasterService,
    engine?: ConversationEngine
  ) {
    this.repository = repository ?? new ConversationRepository(prismaClient);
    this.masterService = masterService ?? new MasterService();
    this.engine = engine ?? new ConversationEngine();
    this.sessionTimeoutHours = config.conversation.sessionTimeoutHours;
  }

  async handleIncomingMessage(input: unknown): Promise<ConversationResponseDto> {
    const request = validateConversationRequest(input) as ConversationRequestDto;

    logger.info({
      service: "ConversationService",
      action: "handleIncomingMessage",
      event: LogEvent.CONVERSATION_STARTED,
      whatsappNumber: request.whatsappNumber,
    });

    try {
      const existingSession = await this.repository.findActiveSessionByWhatsAppNumber(
        request.whatsappNumber
      );

      const command = detectCommand(request.message);

      if (command === ConversationCommand.START || command === ConversationCommand.NEW) {
        if (existingSession) {
          logger.info({
            service: "ConversationService",
            action: "handleIncomingMessage",
            event: LogEvent.COMMAND_RECEIVED,
            whatsappNumber: request.whatsappNumber,
            command,
            sessionId: existingSession.id,
          });

          await this.repository.deleteSession(existingSession.id);
        }

        const newSession = await this.repository.createSession({
          whatsappNumber: request.whatsappNumber,
          currentState: ConversationState.MAIN_MENU,
          conversationData: {},
        });

        logger.info({
          service: "ConversationService",
          action: "handleIncomingMessage",
          event: LogEvent.SESSION_CREATED,
          whatsappNumber: request.whatsappNumber,
          sessionId: newSession.id,
          currentState: ConversationState.MAIN_MENU,
        });

        return {
          session: this.mapToDto(newSession),
          isNewSession: true,
          isExpired: false,
          requiresReset: false,
        };
      }

      if (command === ConversationCommand.RESET) {
        if (existingSession) {
          logger.info({
            service: "ConversationService",
            action: "handleIncomingMessage",
            event: LogEvent.SESSION_RESET,
            whatsappNumber: request.whatsappNumber,
            sessionId: existingSession.id,
          });

          await this.repository.deleteSession(existingSession.id);
        }

        const newSession = await this.repository.createSession({
          whatsappNumber: request.whatsappNumber,
          currentState: ConversationState.MAIN_MENU,
          conversationData: {},
        });

        return {
          session: this.mapToDto(newSession),
          isNewSession: true,
          isExpired: false,
          requiresReset: true,
        };
      }

      if (!existingSession) {
        const newSession = await this.repository.createSession({
          whatsappNumber: request.whatsappNumber,
          currentState: ConversationState.MAIN_MENU,
          conversationData: {},
        });

        logger.info({
          service: "ConversationService",
          action: "handleIncomingMessage",
          event: LogEvent.SESSION_CREATED,
          whatsappNumber: request.whatsappNumber,
          sessionId: newSession.id,
          currentState: ConversationState.MAIN_MENU,
        });

        return {
          session: this.mapToDto(newSession),
          isNewSession: true,
          isExpired: false,
          requiresReset: false,
        };
      }

      const isExpired = this.isSessionExpired(existingSession);

      if (isExpired) {
        logger.info({
          service: "ConversationService",
          action: "handleIncomingMessage",
          event: LogEvent.SESSION_EXPIRED,
          whatsappNumber: request.whatsappNumber,
          previousSessionId: existingSession.id,
          expiresAt: existingSession.expiresAt.toISOString(),
        });

        await this.repository.deleteSession(existingSession.id);

        const newSession = await this.repository.createSession({
          whatsappNumber: request.whatsappNumber,
          currentState: ConversationState.MAIN_MENU,
          conversationData: {},
        });

        return {
          session: this.mapToDto(newSession),
          isNewSession: true,
          isExpired: true,
          requiresReset: false,
        };
      }

      await this.repository.updateLastInteraction(existingSession.id);

      logger.info({
        service: "ConversationService",
        action: "handleIncomingMessage",
        event: LogEvent.SESSION_RESUMED,
        whatsappNumber: request.whatsappNumber,
        sessionId: existingSession.id,
        currentState: existingSession.currentState,
      });

      return {
        session: this.mapToDto(existingSession),
        isNewSession: false,
        isExpired: false,
        requiresReset: false,
      };
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "handleIncomingMessage",
        event: LogEvent.OPERATION_FAILED,
        whatsappNumber: request.whatsappNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError("Failed to handle incoming message.");
    }
  }

  /**
   * Process a conversation message through the ConversationEngine with master data.
   *
   * This method:
   * 1. Retrieves the conversation session
   * 2. Validates and ensures session is active
   * 3. Loads master data (issue categories, etc.) into context
   * 4. Executes the ConversationEngine with the context
   * 5. Persists the result
   *
   * @param sessionId - The conversation session ID
   * @param message - The incoming message
   * @returns Updated session with response
   */
  async processConversationMessage(
    sessionId: string,
    message: string
  ): Promise<{
    session: ConversationSessionDto;
    replyMessage: string;
  }> {
    try {
      logger.info({
        service: "ConversationService",
        action: "processConversationMessage",
        event: LogEvent.CONVERSATION_STARTED,
        sessionId,
      });

      // Retrieve session
      const session = await this.repository.findSessionById(sessionId);
      if (!session) {
        throw new ApplicationError("Conversation session not found.");
      }

      // Load master data to pass to handlers
      const issueCategories = await this.masterService.getIssueCategories();

      // Create context with master data
      const request: ConversationRequestDto = {
        whatsappNumber: session.whatsappNumber,
        message: message.trim(),
      };

      const contextData = (session.conversationData as ConversationContextData) ?? {};

      const context: ConversationContext = createContext(
        this.mapToDto(session),
        request,
        session.currentState as ConversationState,
        contextData,
        issueCategories.map((cat) => ({ id: cat.id, name: cat.name }))
      );

      // Execute engine
      const result = await this.engine.process(context);

      logger.info({
        service: "ConversationService",
        action: "processConversationMessage",
        event: "CONVERSATION_PROCESSED",
        sessionId,
        nextState: result.nextState,
      });

      // Persist result
      const updatedSession = await this.updateSessionState(
        sessionId,
        result.nextState,
        result.updatedConversationData
      );

      return {
        session: updatedSession,
        replyMessage: result.replyMessage,
      };
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "processConversationMessage",
        event: LogEvent.OPERATION_FAILED,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError("Failed to process conversation message.");
    }
  }

  async updateSessionState(
    sessionId: string,
    newState: ConversationState,
    conversationData?: ConversationContextData
  ): Promise<ConversationSessionDto> {
    try {
      const updated = await this.repository.updateSession(sessionId, {
        currentState: newState,
        conversationData: conversationData as any,
      });

      await this.repository.updateExpiresAt(sessionId, this.sessionTimeoutHours);

      logger.info({
        service: "ConversationService",
        action: "updateSessionState",
        event: LogEvent.STATE_CHANGED,
        sessionId,
        newState,
      });

      return this.mapToDto(updated);
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "updateSessionState",
        event: LogEvent.OPERATION_FAILED,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to update session state.");
    }
  }

  async updateSessionContext(
    sessionId: string,
    contextData: ConversationContextData
  ): Promise<ConversationSessionDto> {
    try {
      const updated = await this.repository.updateSession(sessionId, {
        conversationData: contextData as any,
      });

      logger.info({
        service: "ConversationService",
        action: "updateSessionContext",
        event: LogEvent.CONTEXT_UPDATED,
        sessionId,
      });

      return this.mapToDto(updated);
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "updateSessionContext",
        event: LogEvent.OPERATION_FAILED,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to update session context.");
    }
  }

  async linkCustomerToSession(sessionId: string, customerId: string): Promise<ConversationSessionDto> {
    try {
      const updated = await this.repository.updateSession(sessionId, {
        customerId,
      });

      logger.info({
        service: "ConversationService",
        action: "linkCustomerToSession",
        event: LogEvent.CUSTOMER_LINKED,
        sessionId,
        customerId,
      });

      return this.mapToDto(updated);
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "linkCustomerToSession",
        event: LogEvent.OPERATION_FAILED,
        sessionId,
        customerId: sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to link customer to session.");
    }
  }

  async linkTicketToSession(sessionId: string, ticketId: string): Promise<ConversationSessionDto> {
    try {
      const updated = await this.repository.updateSession(sessionId, {
        currentTicketId: ticketId,
      });

      logger.info({
        service: "ConversationService",
        action: "linkTicketToSession",
        event: LogEvent.TICKET_LINKED,
        sessionId,
        ticketId,
      });

      return this.mapToDto(updated);
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "linkTicketToSession",
        event: LogEvent.OPERATION_FAILED,
        sessionId,
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to link ticket to session.");
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      await this.repository.deleteSession(sessionId);

      logger.info({
        service: "ConversationService",
        action: "endSession",
        event: LogEvent.SESSION_DELETED,
        sessionId,
      });
    } catch (error) {
      logger.error({
        service: "ConversationService",
        action: "endSession",
        event: LogEvent.OPERATION_FAILED,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to end session.");
    }
  }

  private isSessionExpired(session: ConversationSession): boolean {
    return new Date() > session.expiresAt;
  }

  private mapToDto(session: ConversationSession): ConversationSessionDto {
    return {
      id: session.id,
      whatsappNumber: session.whatsappNumber,
      customerId: session.customerId,
      currentTicketId: session.currentTicketId,
      currentState: session.currentState,
      conversationData: (session.conversationData as Record<string, unknown>) ?? {},
      lastInteractionAt: session.lastInteractionAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
