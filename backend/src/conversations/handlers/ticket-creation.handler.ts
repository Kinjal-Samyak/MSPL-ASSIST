import type { ConversationStateHandler } from "../conversation-state-handler";
import type { ConversationContext } from "../engine-context";
import type { ConversationResult } from "../conversation-result";
import type { ConversationContextData } from "../conversation-context";
import { createResult } from "../conversation-result";
import { ConversationState } from "../conversation.state";
import { ApplicationError } from "../../errors";
import { logger } from "../../utils/logger";
import { LogEvent } from "../../shared/log-event";
import { TicketService } from "../../services/ticket.service";
import { ConversationTicketMapper } from "../mappers/conversation-ticket.mapper";

/**
 * TicketCreationHandler orchestrates the ticket creation process.
 *
 * This handler integrates conversation data with the business ticket creation logic.
 * It validates that all required conversation data is present, maps it to a DTO,
 * and calls TicketService to create the actual ticket.
 *
 * Responsibilities (ORCHESTRATION WITH MAPPER AND SERVICE):
 * ✓ Validate required conversation data exists (customer, deployment, mobile, issues)
 * ✓ Use ConversationTicketMapper to convert context to DTO
 * ✓ Call TicketService.createTicket()
 * ✓ Handle successful ticket creation: Update context, transition to CONFIRMATION
 * ✓ Handle service error: Log, stay in WAITING_TICKET_CREATION, return error message
 * ✓ Return ConversationResult
 *
 * Handler must NOT:
 * ✗ Access repositories directly
 * ✗ Access Prisma
 * ✗ Implement business logic already in TicketService
 * ✗ Generate ticket numbers (TicketNumberService handles this)
 * ✗ Create TicketIssueItems (TicketService handles this)
 * ✗ Perform data validations
 * ✗ Lose conversation data on failure
 *
 * All business logic is owned by TicketService.
 * Handler only orchestrates the conversation flow based on service results.
 *
 * Architecture:
 * ConversationEngine
 *     ↓
 * TicketCreationHandler (orchestration)
 *     ├─→ ConversationTicketMapper (pure mapping)
 *     └─→ TicketService (business logic)
 *            ├─→ MasterRepository (data access)
 *            ├─→ TicketRepository (data access)
 *            ├─→ TicketNumberService (business logic)
 *            └─→ Prisma Client
 *
 * State transitions:
 * - Ticket created: WAITING_TICKET_CREATION → CONFIRMATION
 * - Ticket creation failed: WAITING_TICKET_CREATION → WAITING_TICKET_CREATION (stay)
 * - Service error: Throws ApplicationError
 *
 * Current state: WAITING_TICKET_CREATION
 * Input: Full ConversationContext with customer, deployment, issues, descriptions, photos
 * Output: ConversationResult with ticket details or error
 * Next state (success): CONFIRMATION
 * Next state (failure): WAITING_TICKET_CREATION (retry)
 */
export class TicketCreationHandler implements ConversationStateHandler {
  private readonly ticketService: TicketService;

  constructor(ticketService?: TicketService) {
    this.ticketService = ticketService ?? new TicketService();
  }

  async handle(context: ConversationContext): Promise<ConversationResult> {
    try {
      // Log start of ticket creation
      logger.info({
        service: "TicketCreationHandler",
        action: "handle",
        event: LogEvent.TICKET_CREATION_STARTED,
        sessionId: context.session.id,
      });

      // Validate required conversation data
      this.validateContextData(context);

      // Map conversation context to ticket DTO
      const createTicketDto = ConversationTicketMapper.mapToCreateTicketDto(context.data);

      // Call TicketService to create ticket
      logger.info({
        service: "TicketCreationHandler",
        action: "handle",
        event: "SERVICE_CALL_START",
        sessionId: context.session.id,
        issueCategoryId: createTicketDto.issueCategoryId,
      });

      const ticketResponse = await this.ticketService.createTicket(createTicketDto);

      // Handle existing ticket case
      if (ticketResponse.existingTicket) {
        logger.info({
          service: "TicketCreationHandler",
          action: "handle",
          event: "EXISTING_TICKET_FOUND",
          sessionId: context.session.id,
          ticketNumber: ticketResponse.ticketNumber,
          status: ticketResponse.currentStatus,
        });

        return this.createExistingTicketResponse(ticketResponse, context);
      }

      // Handle new ticket creation
      return this.createSuccessResponse(ticketResponse, context);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Validate that all required conversation data is present.
   *
   * Required:
   * - registeredCustomer with mobile and customerId and verified=true
   * - activeDeployment with deploymentId and vehicleNumber
   * - At least one selectedIssue with description
   *
   * @throws ApplicationError if validation fails
   */
  private validateContextData(context: ConversationContext): void {
    const { data } = context;

    // Validate registered customer
    if (!data.registeredCustomer) {
      throw new ApplicationError("Registered rider not found in conversation context");
    }

    const { registeredCustomer } = data;
    if (!registeredCustomer.mobile) {
      throw new ApplicationError("Registered mobile number not found in context");
    }

    if (!registeredCustomer.customerId) {
      throw new ApplicationError("Rider ID not found in context");
    }

    if (!registeredCustomer.verified) {
      throw new ApplicationError("Rider verification not completed");
    }

    // Validate active deployment
    if (!data.activeDeployment) {
      throw new ApplicationError("Active deployment not found in conversation context");
    }

    const { activeDeployment } = data;
    if (!activeDeployment.deploymentId || !activeDeployment.vehicleNumber) {
      throw new ApplicationError("Deployment information incomplete in context");
    }

    // Validate selected issues
    if (!data.selectedIssues || data.selectedIssues.length === 0) {
      throw new ApplicationError("No issues selected in conversation context");
    }

    // Validate each issue has required data
    for (let i = 0; i < data.selectedIssues.length; i++) {
      const issue = data.selectedIssues[i];
      if (!issue.issueCategoryId) {
        throw new ApplicationError(`Issue ${i + 1} missing category ID`);
      }

      if (!issue.description) {
        throw new ApplicationError(`Issue ${i + 1} missing description`);
      }
    }

    logger.info({
      service: "TicketCreationHandler",
      action: "validateContextData",
      event: "VALIDATION_SUCCESS",
      sessionId: context.session.id,
      issueCount: data.selectedIssues.length,
      hasDeployment: Boolean(data.activeDeployment),
    });
  }

  /**
   * Create success response when new ticket is created.
   *
   * @param ticketResponse - Response from TicketService
   * @param context - Current conversation context
   * @returns ConversationResult
   */
  private createSuccessResponse(
    ticketResponse: Awaited<ReturnType<TicketService["createTicket"]>>,
    context: ConversationContext
  ): ConversationResult {
    // Ensure ticketId and createdAt are present (should always be true for new tickets)
    if (!ticketResponse.ticketId || !ticketResponse.createdAt) {
      throw new ApplicationError("Ticket creation failed: Missing ticketId or createdAt");
    }

    // Update context with ticket information
    const updatedData: ConversationContextData = {
      ...context.data,
      ticket: {
        ticketId: ticketResponse.ticketId,
        ticketNumber: ticketResponse.ticketNumber,
        status: "Open",
        createdAt: ticketResponse.createdAt,
      },
    };

    logger.info({
      service: "TicketCreationHandler",
      action: "createSuccessResponse",
      event: LogEvent.TICKET_CREATION_SUCCESS,
      sessionId: context.session.id,
      ticketId: ticketResponse.ticketId,
      ticketNumber: ticketResponse.ticketNumber,
    });

    logger.info({
      service: "TicketCreationHandler",
      action: "createSuccessResponse",
      event: LogEvent.CONTEXT_UPDATED,
      sessionId: context.session.id,
      fieldsUpdated: ["ticket"],
    });

    logger.info({
      service: "TicketCreationHandler",
      action: "createSuccessResponse",
      event: LogEvent.STATE_CHANGED,
      sessionId: context.session.id,
      fromState: ConversationState.WAITING_TICKET_CREATION,
      toState: ConversationState.CONFIRMATION,
    });

    return createResult(
      "Your service request has been successfully submitted.\nPreparing your ticket confirmation...",
      ConversationState.CONFIRMATION,
      updatedData,
      false
    );
  }

  /**
   * Create response when ticket already exists for customer.
   *
   * @param ticketResponse - Response from TicketService
   * @param context - Current conversation context
   * @returns ConversationResult
   */
  private createExistingTicketResponse(
    ticketResponse: Awaited<ReturnType<TicketService["createTicket"]>>,
    context: ConversationContext
  ): ConversationResult {
    logger.info({
      service: "TicketCreationHandler",
      action: "createExistingTicketResponse",
      event: "EXISTING_TICKET_RESPONSE",
      sessionId: context.session.id,
      ticketNumber: ticketResponse.ticketNumber,
      currentStatus: ticketResponse.currentStatus,
    });

    return createResult(
      `You already have an active service request.\nTicket Number: ${ticketResponse.ticketNumber}\nStatus: ${ticketResponse.currentStatus}\n\nWe will update you soon.`,
      ConversationState.CONFIRMATION,
      context.data,
      false
    );
  }

  /**
   * Handle ticket creation failure.
   *
   * Logs error, returns user-friendly message, stays in same state.
   *
   * @param error - Error from service or validation
   * @param context - Current conversation context (preserved)
   * @returns ConversationResult
   */
  private handleError(error: unknown, context: ConversationContext): ConversationResult {
    logger.error({
      service: "TicketCreationHandler",
      action: "handle",
      event: LogEvent.TICKET_CREATION_FAILED,
      sessionId: context.session.id,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    logger.info({
      service: "TicketCreationHandler",
      action: "handleError",
      event: "STAYING_IN_STATE",
      sessionId: context.session.id,
      currentState: ConversationState.WAITING_TICKET_CREATION,
      reason: "Error occurred, user can retry",
    });

    // Never throw - return error message and stay in state so user can retry
    return createResult(
      "We were unable to create your service request.\nPlease try again.\n\nIf the problem continues, please contact MSPL Support.",
      ConversationState.WAITING_TICKET_CREATION,
      context.data, // Preserve all conversation data
      false
    );
  }
}
