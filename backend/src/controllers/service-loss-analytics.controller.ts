import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import { ServiceLossAnalyticsService } from "../services/service-loss-analytics.service";
import { ServiceLossExportService } from "../services/service-loss-export.service";
import { ValidationError } from "../errors";

export class ServiceLossAnalyticsController {
  constructor(
    private readonly service: ServiceLossAnalyticsService = new ServiceLossAnalyticsService(),
    private readonly exportService: ServiceLossExportService = new ServiceLossExportService()
  ) {}

  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getSummary(req.query);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDrilldown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getDrilldown(req.query);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  export = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const format = String(req.query.format ?? "excel").toLowerCase();
      if (format !== "excel" && format !== "pdf") {
        throw new ValidationError("format must be excel or pdf.");
      }
      const { summary, rows } = await this.service.getRowsForExport(req.query);
      const file =
        format === "excel"
          ? this.exportService.buildExcel(summary, rows)
          : await this.exportService.buildPdf(summary, rows);

      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
      res.status(200).send(file.content);
    } catch (error) {
      next(error);
    }
  };
}
