import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type { DashboardSummaryDto } from "../dto/dashboard.dto";
import { dashboardService } from "../services/dashboard.service";

export class DashboardController {
  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await dashboardService.getSummary(req.query);
      const response: ApiResponse<DashboardSummaryDto> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
