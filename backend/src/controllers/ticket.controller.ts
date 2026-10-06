import type { Request, Response, NextFunction } from "express";
import { TicketService } from "../services/ticket.service";
import type { ApiResponse } from "../dto/master.dto";
import type {
  TicketAttachmentResponseDto,
  TicketAssignmentResponseDto,
  TicketChargesResponseDto,
  TicketCommentResponseDto,
  TicketCreationResponseDto,
  TicketDetailResponseDto,
  TicketEtaResponseDto,
  TicketListResponseDto,
  TicketNotificationResponseDto,
  TicketStatusResponseDto,
} from "../dto/ticket.dto";

export class TicketController {
  private readonly ticketService: TicketService;

  constructor(ticketService?: TicketService) {
    this.ticketService = ticketService ?? new TicketService();
  }

  createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.createTicket(req.body);

      const response: ApiResponse<TicketCreationResponseDto> = {
        success: true,
        data: result,
      };

      const statusCode = result.existingTicket ? 200 : 201;
      res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  };

  createConversationTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { const result = await this.ticketService.createConversationTicket(req.body); res.status(result.existingTicket ? 200 : 201).json({ success: true, data: result }); } catch (error) { next(error); } };

  getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.getTickets(req.query);

      const response: ApiResponse<TicketListResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.getTicketById(req.params.ticketId);

      const response: ApiResponse<TicketDetailResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.addComment(req.params.ticketId, req.body);

      const response: ApiResponse<TicketCommentResponseDto> = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.getComments(req.params.ticketId);

      const response: ApiResponse<TicketCommentResponseDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.addAttachment(req.params.ticketId, req.body);

      const response: ApiResponse<TicketAttachmentResponseDto> = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAttachments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.getAttachments(req.params.ticketId);

      const response: ApiResponse<TicketAttachmentResponseDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.getNotifications(req.params.ticketId);

      const response: ApiResponse<TicketNotificationResponseDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  assignTechnician = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.assignTechnician(req.params.ticketId, req.body);

      const response: ApiResponse<TicketAssignmentResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.updateStatus(req.params.ticketId, req.body);

      const response: ApiResponse<TicketStatusResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateEta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.updateEta(req.params.ticketId, req.body);

      const response: ApiResponse<TicketEtaResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateCharges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.updateCharges(req.params.ticketId, req.body);

      const response: ApiResponse<TicketChargesResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
