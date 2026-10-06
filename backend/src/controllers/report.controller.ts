import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  AdminReportDto,
  CustomerReportDto,
  DeploymentReportDto,
  ExecutiveDashboardDto,
  NotificationReportDto,
  ReportDashboardDto,
  ReportListResponseDto,
  TicketReportDto,
  VehicleReportDto,
  WorkshopReportDto,
} from "../dto/report.dto";
import { ReportService } from "../services/report.service";

export class ReportController {
  private readonly service: ReportService;

  constructor(service?: ReportService) {
    this.service = service ?? new ReportService();
  }

  getExecutiveDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getExecutiveDashboard(req.query);
      const response: ApiResponse<ExecutiveDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDashboard();
      const response: ApiResponse<ReportDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTicketReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTicketReports(req.query);
      const response: ApiResponse<ReportListResponseDto<TicketReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getCustomerReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerReports(req.query);
      const response: ApiResponse<ReportListResponseDto<CustomerReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getVehicleReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getVehicleReports(req.query);
      const response: ApiResponse<ReportListResponseDto<VehicleReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDeploymentReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDeploymentReports(req.query);
      const response: ApiResponse<ReportListResponseDto<DeploymentReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getWorkshopReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getWorkshopReports(req.query);
      const response: ApiResponse<ReportListResponseDto<WorkshopReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getNotificationReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getNotificationReports(req.query);
      const response: ApiResponse<ReportListResponseDto<NotificationReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAdminReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getAdminReports(req.query);
      const response: ApiResponse<ReportListResponseDto<AdminReportDto>> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.exportReport(
        String(req.query.report ?? ""),
        req.query.format,
        req.query,
        req.authUser?.email ?? "Unknown"
      );
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
      res.status(200).send(result.content);
    } catch (error) {
      next(error);
    }
  };
}
