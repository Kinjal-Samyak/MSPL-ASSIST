import type { Request, Response, NextFunction } from "express";
import { TicketCommunicationService } from "../services/ticket-communication.service";
import type { WorkflowActor } from "../services/ticket-workflow.service";
import type { ApiResponse } from "../dto/master.dto";
import { UnauthorizedError } from "../errors";

export class TicketCommunicationController {
  private readonly service: TicketCommunicationService;

  constructor(service?: TicketCommunicationService) {
    this.service = service ?? new TicketCommunicationService();
  }

  private resolveActor(req: Request): WorkflowActor {
    if (!req.authUser) {
      throw new UnauthorizedError("Authentication is required.");
    }
    return { userId: req.authUser.userId, role: req.authUser.role };
  }

  getCommunicationCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getCommunicationCenter(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.sendCommunication(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  resend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.resendCommunication(req.params.communicationId, this.resolveActor(req), req.body);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };
}
