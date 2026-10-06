import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import { VehicleModelRateService } from "../services/vehicle-model-rate.service";

export class VehicleModelRateController {
  constructor(private readonly service: VehicleModelRateService = new VehicleModelRateService()) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.listWithCurrentRate();
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  listRateHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.listRateHistory(req.params.vehicleModelId);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  addRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.addRate(req.params.vehicleModelId, req.body);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateSlaTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.updateSlaTarget(req.params.vehicleModelId, req.body);
      const response: ApiResponse<typeof data> = { success: true, data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
