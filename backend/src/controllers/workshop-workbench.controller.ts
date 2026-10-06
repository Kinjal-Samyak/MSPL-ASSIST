import type { Request, Response, NextFunction } from "express";
import { WorkshopWorkbenchService } from "../services/workshop-workbench.service";
import type { ApiResponse } from "../dto/master.dto";
import type { WorkshopWorkbenchListResponseDto, WorkshopWorkbenchSummaryDto } from "../dto/workshop-workbench.dto";

export class WorkshopWorkbenchController {
  private readonly service: WorkshopWorkbenchService;

  constructor(service?: WorkshopWorkbenchService) {
    this.service = service ?? new WorkshopWorkbenchService();
  }

  getSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSummary();
      const response: ApiResponse<WorkshopWorkbenchSummaryDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  listJobCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listJobCards(req.query);
      const response: ApiResponse<WorkshopWorkbenchListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
