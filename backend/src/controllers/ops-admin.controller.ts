import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  ActivityTimelineListResponseDto,
  OpsAdminMutationResponseDto,
  OpsAdminTicketListResponseDto,
} from "../dto/ops-admin.dto";
import type { AdminActorContext } from "../services/admin.service";
import { OpsAdminService } from "../services/ops-admin.service";

function toActor(req: Request): AdminActorContext {
  return {
    userId: req.authUser?.userId,
    name: req.authUser?.email,
    role: req.authUser?.role,
  };
}

export class OpsAdminController {
  private readonly service: OpsAdminService;

  constructor(service?: OpsAdminService) {
    this.service = service ?? new OpsAdminService();
  }

  searchTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.searchTickets(req.query);
      const response: ApiResponse<OpsAdminTicketListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deleteTicket(req.params.ticketId, req.body, toActor(req));
      const response: ApiResponse<OpsAdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  restoreTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.restoreTicket(req.params.ticketId, toActor(req));
      const response: ApiResponse<OpsAdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  forceCloseTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.forceCloseTicket(req.params.ticketId, req.body, toActor(req));
      const response: ApiResponse<OpsAdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  reassignTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.reassignTicket(req.params.ticketId, req.body, toActor(req));
      const response: ApiResponse<OpsAdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  searchActivityTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.searchActivityTimeline(req.query);
      const response: ApiResponse<ActivityTimelineListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
