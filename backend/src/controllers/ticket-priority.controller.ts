import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import { TicketPriorityService } from "../services/ticket-priority.service";
import { UnauthorizedError } from "../errors";

export class TicketPriorityController {
  constructor(private readonly service = new TicketPriorityService()) {}

  private actor(req: Request) {
    if (!req.authUser) throw new UnauthorizedError("Authentication is required.");
    return { userId: req.authUser.userId, role: req.authUser.role };
  }

  updatePriority = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updatePriority(req.params.ticketId, this.actor(req), req.body);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  listPriorityChanges = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listPriorityChanges(req.params.ticketId);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
