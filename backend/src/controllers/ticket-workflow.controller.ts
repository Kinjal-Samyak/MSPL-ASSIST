import type { Request, Response, NextFunction } from "express";
import { TicketWorkflowService, type WorkflowActor } from "../services/ticket-workflow.service";
import { JobCardPdfService } from "../services/job-card-pdf.service";
import { PartsCatalogService } from "../services/parts-catalog.service";
import type { ApiResponse } from "../dto/master.dto";
import type { PartResponseDto } from "../dto/parts.dto";
import type {
  ApproveAllSparePartRequestsResponseDto,
  JobCardDetailDto,
  JobCardListItemDto,
  JobCardPdfHistoryItemDto,
  JobCardWorkflowTransitionResponseDto,
  ReturnSparePartsToInventoryResponseDto,
  ServiceEngineerDashboardDto,
  SparePartReturnRequestDto,
  SparePartRequestDto,
  SparePartRequestListResponseDto,
  TicketCloseDecisionResponseDto,
  TicketWorkflowTransitionResponseDto,
} from "../dto/ticket-workflow.dto";
import type { TicketDetailResponseDto, TicketListResponseDto } from "../dto/ticket.dto";
import { UnauthorizedError } from "../errors";
import { JobCardRepairService } from "../services/job-card-repair.service";

export class TicketWorkflowController {
  private readonly service: TicketWorkflowService;
  private readonly pdfService: JobCardPdfService;
  private readonly partsCatalogService: PartsCatalogService;
  private readonly jobCardRepairService: JobCardRepairService;

  constructor(
    service?: TicketWorkflowService,
    pdfService?: JobCardPdfService,
    partsCatalogService?: PartsCatalogService,
    jobCardRepairService?: JobCardRepairService
  ) {
    this.service = service ?? new TicketWorkflowService();
    this.pdfService = pdfService ?? new JobCardPdfService();
    this.partsCatalogService = partsCatalogService ?? new PartsCatalogService();
    this.jobCardRepairService = jobCardRepairService ?? new JobCardRepairService();
  }

  startRepair = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.jobCardRepairService.startRepair(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  private resolveActor(req: Request): WorkflowActor {
    if (!req.authUser) {
      throw new UnauthorizedError("Authentication is required.");
    }

    return { userId: req.authUser.userId, role: req.authUser.role };
  }

  private respond(
    res: Response,
    result: TicketWorkflowTransitionResponseDto | JobCardWorkflowTransitionResponseDto
  ): void {
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }

  assignServiceTl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.assignServiceTl(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  transferServiceTl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.transferServiceTl(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  resolveConsultation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.resolveConsultation(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  requireWorkshop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.requireWorkshop(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  waitingForParts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.waitingForParts(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  resume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.resume(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  markJobCardCompleted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.markJobCardCompleted(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  readyForDeployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.readyForDeployment(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  returnForRework = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.returnJobCardForRework(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  closeTicketAfterVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.closeTicketAfterVerification(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  unlockJobCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.unlockJobCard(req.params.ticketId, this.resolveActor(req), req.body);
      this.respond(res, result);
    } catch (error) {
      next(error);
    }
  };

  listJobCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listJobCards(this.resolveActor(req));
      const response: ApiResponse<JobCardListItemDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getJobCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getJobCard(req.params.jobCardId, this.resolveActor(req));
      const response: ApiResponse<JobCardListItemDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  listMyTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listMyTickets(this.resolveActor(req), req.query);
      const response: ApiResponse<TicketListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getMyTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getMyTicket(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<TicketDetailResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  serviceEngineerDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.serviceEngineerDashboard(this.resolveActor(req));
      const response: ApiResponse<ServiceEngineerDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getJobCardDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getJobCardDetail(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<JobCardDetailDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  saveJobCardDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.saveJobCardDetails(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<JobCardDetailDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  requestSpareParts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.requestSpareParts(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartRequestDto[]> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  listSparePartRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listSparePartRequests(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<SparePartRequestDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  listAllSparePartRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listAllSparePartRequests(req.query);
      const response: ApiResponse<SparePartRequestListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  approveSparePartRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.approveSparePartRequest(req.params.requestId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  rejectSparePartRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.rejectSparePartRequest(req.params.requestId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  reverseSparePartRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.reverseSparePartRequest(req.params.requestId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  approveAllSparePartRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.approveAllSparePartRequests(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<ApproveAllSparePartRequestsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  returnSparePartsToInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.returnSparePartsToInventory(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<ReturnSparePartsToInventoryResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  submitSparePartReturnRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.submitSparePartReturnRequest(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartReturnRequestDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  listSparePartReturnRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listSparePartReturnRequests(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<SparePartReturnRequestDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  approveSparePartReturnRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.approveSparePartReturnRequest(req.params.requestId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartReturnRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  rejectSparePartReturnRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.rejectSparePartReturnRequest(req.params.requestId, this.resolveActor(req), req.body);
      const response: ApiResponse<SparePartReturnRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  recordConsumedQuantity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.recordConsumedQuantity(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  closeTicketDecision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.closeTicketDecision(req.params.ticketId, this.resolveActor(req), req.body);
      const response: ApiResponse<TicketCloseDecisionResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  searchParts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = typeof req.query.code === "string" ? req.query.code : undefined;
      const result = await this.partsCatalogService.listParts({ search: code, active: true });
      const response: ApiResponse<PartResponseDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  downloadJobCardPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.resolveActor(req);
      const jobCard = await this.service.getJobCardDetail(req.params.ticketId, actor);
      const buffer = await this.pdfService.render(jobCard);
      const fileName = `${jobCard.jobCardNumber}.pdf`;

      await this.service.recordJobCardPdfHistory(jobCard.id, jobCard.version, fileName, buffer, actor);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  };

  downloadDeliveryNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.resolveActor(req);
      const jobCard = await this.service.getJobCardDetail(req.params.ticketId, actor);
      const buffer = await this.pdfService.renderDeliveryNote(jobCard);
      const fileName = `${jobCard.jobCardNumber}-delivery-note.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  };

  listJobCardPdfHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listJobCardPdfHistory(req.params.ticketId, this.resolveActor(req));
      const response: ApiResponse<JobCardPdfHistoryItemDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  downloadJobCardPdfHistoryItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileName, content } = await this.service.getJobCardPdfHistoryContent(
        req.params.pdfHistoryId,
        this.resolveActor(req)
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      res.status(200).send(content);
    } catch (error) {
      next(error);
    }
  };
}
