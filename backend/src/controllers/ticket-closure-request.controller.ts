import type { Request, Response, NextFunction } from "express";
import { TicketClosureRequestService } from "../services/ticket-closure-request.service";
import type { WorkflowActor } from "../services/ticket-workflow.service";
import type { ApiResponse } from "../dto/master.dto";
import type { TicketClosureRequestResponseDto } from "../dto/ticket-closure-request.dto";
import { UnauthorizedError } from "../errors";

export class TicketClosureRequestController {
  private readonly service: TicketClosureRequestService;

  constructor(service?: TicketClosureRequestService) {
    this.service = service ?? new TicketClosureRequestService();
  }

  private resolveActor(req: Request): WorkflowActor {
    if (!req.authUser) {
      throw new UnauthorizedError("Authentication is required.");
    }
    return { userId: req.authUser.userId, role: req.authUser.role };
  }

  private respond(res: Response, data: TicketClosureRequestResponseDto | TicketClosureRequestResponseDto[]): void {
    const response: ApiResponse<typeof data> = { success: true, data };
    res.status(200).json(response);
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createRequest(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  listForTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listForTicket(req.params.ticketId, this.resolveActor(req));
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  listPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listPendingForServiceTl(this.resolveActor(req));
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.decide(req.params.requestId, this.resolveActor(req), {
        decision: "APPROVED",
        remarks: req.body?.remarks,
      });
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.decide(req.params.requestId, this.resolveActor(req), {
        decision: "REJECTED",
        remarks: req.body?.remarks,
      });
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };
}
