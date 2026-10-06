import { prismaClient } from "../database";
import { TicketClosureRequestRepository } from "../repositories/ticket-closure-request.repository";
import { validateTicketIdParam } from "../validators/ticket.validator";
import {
  validateCreateTicketClosureRequestDto,
  validateDecideTicketClosureRequestDto,
} from "../validators/ticket-closure-request.validator";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import type { TicketClosureRequestResponseDto } from "../dto/ticket-closure-request.dto";
import type { WorkflowActor } from "./ticket-workflow.service";

export class TicketClosureRequestService {
  private readonly repository: TicketClosureRequestRepository;

  constructor(private readonly prisma = prismaClient, repository?: TicketClosureRequestRepository) {
    this.repository = repository ?? new TicketClosureRequestRepository(this.prisma);
  }

  /** Coordinator (or Admin) raises either a mistake-cancellation or a rider-driven early closure request. */
  async createRequest(
    ticketIdInput: unknown,
    actor: WorkflowActor,
    input: unknown
  ): Promise<TicketClosureRequestResponseDto> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "COORDINATOR") {
      throw new ForbiddenError("Only a Coordinator can request ticket cancellation or early closure.");
    }

    const ticketId = validateTicketIdParam(ticketIdInput);
    const payload = validateCreateTicketClosureRequestDto(input);

    const ticket = await this.repository.findTicketContext(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }
    if (ticket.statusName === "Closed" || ticket.statusName === "Cancelled") {
      throw new ConflictError(`Ticket ${ticket.ticketNumber} is already ${ticket.statusName} and cannot have a new closure request.`);
    }

    const pending = await this.repository.findPendingByTicketId(ticketId);
    if (pending) {
      throw new ConflictError("This ticket already has a pending cancellation/closure request awaiting Service Engineer approval.");
    }

    return this.repository.create(ticketId, payload, actor.userId);
  }

  /** Service Engineer's approval queue: requests on their own tickets, plus any not yet assigned to a Service Engineer. Admin sees all. */
  async listPendingForServiceTl(actor: WorkflowActor): Promise<TicketClosureRequestResponseDto[]> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "SERVICE_TL") {
      throw new ForbiddenError("Only a Service Engineer may view pending closure requests.");
    }
    return this.repository.listPendingForServiceTl((actor.role === "ADMIN" || actor.role === "SERVICE_MANAGER") ? null : actor.userId);
  }

  async listForTicket(ticketIdInput: unknown, actor: WorkflowActor): Promise<TicketClosureRequestResponseDto[]> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "COORDINATOR" && actor.role !== "SERVICE_TL") {
      throw new ForbiddenError("You are not permitted to view closure requests for this ticket.");
    }
    const ticketId = validateTicketIdParam(ticketIdInput);
    return this.repository.listForTicket(ticketId);
  }

  /** Service Engineer (or Admin) approves or rejects a pending request. Approval is the only path to a Cancelled/early-Closed ticket. */
  async decide(requestIdInput: unknown, actor: WorkflowActor, input: unknown): Promise<TicketClosureRequestResponseDto> {
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER") && actor.role !== "SERVICE_TL") {
      throw new ForbiddenError("Only a Service Engineer can approve or reject a closure request.");
    }

    const requestId = validateTicketIdParam(requestIdInput);
    const payload = validateDecideTicketClosureRequestDto(input);

    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundError(`Closure request with id ${requestId} was not found.`);
    }
    if (request.status !== "PENDING") {
      throw new ConflictError(`This request has already been ${request.status.toLowerCase()}.`);
    }
    if (actor.role === "SERVICE_TL" && request.ticket.serviceTlId !== null && request.ticket.serviceTlId !== actor.userId) {
      throw new ForbiddenError("Only the ticket's assigned Service Engineer can decide this request.");
    }

    if (payload.decision === "REJECTED") {
      return this.repository.reject(requestId, request.ticketId, request.requestType, actor.userId, payload.remarks as string);
    }

    const targetStatusName = request.requestType === "CANCELLATION" ? "Cancelled" : "Closed";
    const targetStatusId = await this.repository.findStatusIdByName(targetStatusName);
    if (!targetStatusId) {
      throw new ConflictError(`No active '${targetStatusName}' status is configured in Status Master.`);
    }

    const payment =
      request.requestType === "EARLY_CLOSURE" && !request.paymentWaived
        ? {
            paymentMode: request.paymentMode as string,
            utrNumber: request.paymentUtrNumber as string,
            amount: Number(request.paymentAmount),
          }
        : null;

    return this.repository.approve(
      requestId,
      request.ticketId,
      request.requestType,
      targetStatusId,
      actor.userId,
      payload.remarks,
      payment
    );
  }
}
