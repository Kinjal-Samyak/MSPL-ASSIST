import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  DeploymentDashboardDto,
  DeploymentDetailDto,
  DeploymentHistoryResponseDto,
  DeploymentListResponseDto,
  DeploymentMutationResponseDto,
  DeploymentPaymentsResponseDto,
  DeploymentStatusDto,
  DeploymentTimelineResponseDto,
} from "../dto/deployment-module.dto";
import { DeploymentModuleService } from "../services/deployment-module.service";

export class DeploymentModuleController {
  private readonly service: DeploymentModuleService;

  constructor(service?: DeploymentModuleService) {
    this.service = service ?? new DeploymentModuleService();
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDashboard(req.query);
      const response: ApiResponse<DeploymentDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDeployments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDeployments(req.query);
      const response: ApiResponse<DeploymentListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  searchDeployments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.searchDeployments(req.query);
      const response: ApiResponse<DeploymentListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDeploymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDeploymentById(req.params.deploymentId);
      const response: ApiResponse<DeploymentDetailDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTimeline(req.params.deploymentId, req.query);
      const response: ApiResponse<DeploymentTimelineResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getPayments(req.params.deploymentId, req.query);
      const response: ApiResponse<DeploymentPaymentsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getHistory(req.params.deploymentId, req.query);
      const response: ApiResponse<DeploymentHistoryResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getStatus(req.params.deploymentId);
      const response: ApiResponse<DeploymentStatusDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  closeDeployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.closeDeployment(req.params.deploymentId);
      const response: ApiResponse<DeploymentMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  reopenDeployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.reopenDeployment(req.params.deploymentId);
      const response: ApiResponse<DeploymentMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
