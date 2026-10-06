import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  VehicleDashboardDto,
  VehicleDeploymentHistoryResponseDto,
  VehicleDetailDto,
  VehicleDocumentResponseDto,
  VehicleHealthSummaryDto,
  VehicleListResponseDto,
  VehicleMutationResponseDto,
  VehicleServiceHistoryResponseDto,
  VehicleStatusSummaryDto,
  VehicleTimelineResponseDto,
} from "../dto/vehicle.dto";
import { VehicleService } from "../services/vehicle.service";

export class VehicleController {
  private readonly service: VehicleService;

  constructor(service?: VehicleService) {
    this.service = service ?? new VehicleService();
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDashboard(req.query);
      const response: ApiResponse<VehicleDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getVehicles(req.query);
      const response: ApiResponse<VehicleListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  searchVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.searchVehicles(req.query);
      const response: ApiResponse<VehicleListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getVehicleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getVehicleById(req.params.vehicleId);
      const response: ApiResponse<VehicleDetailDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTimeline(req.params.vehicleId, req.query);
      const response: ApiResponse<VehicleTimelineResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getCurrentDeployment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCurrentDeployment(req.params.vehicleId);
      const response = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDeploymentHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDeploymentHistory(req.params.vehicleId, req.query);
      const response: ApiResponse<VehicleDeploymentHistoryResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getServiceHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getServiceHistory(req.params.vehicleId, req.query);
      const response: ApiResponse<VehicleServiceHistoryResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getStatusSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getStatusSummary(req.params.vehicleId);
      const response: ApiResponse<VehicleStatusSummaryDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getHealthSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getHealthSummary(req.params.vehicleId);
      const response: ApiResponse<VehicleHealthSummaryDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDocuments(req.params.vehicleId, req.query);
      const response: ApiResponse<VehicleDocumentResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  activateVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.activateVehicle(req.params.vehicleId);
      const response: ApiResponse<VehicleMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deactivateVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deactivateVehicle(req.params.vehicleId);
      const response: ApiResponse<VehicleMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

