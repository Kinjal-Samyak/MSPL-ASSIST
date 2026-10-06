import type { Request, Response, NextFunction } from "express";
import { MasterService } from "../services/master.service";
import type { ApiResponse, HubDto, IssueCategoryDto, StatusDto, VehicleModelDto } from "../dto/master.dto";

export class MasterController {
  private readonly service: MasterService;

  constructor(service?: MasterService) {
    this.service = service ?? new MasterService();
  }

  getStatuses = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statuses = await this.service.getStatuses();

      const response: ApiResponse<StatusDto[]> = {
        success: true,
        data: statuses.map((status) => ({
          id: status.id,
          name: status.name,
          displayOrder: status.displayOrder,
          customerVisible: status.customerVisible,
          active: status.active,
          createdAt: status.createdAt.toISOString(),
          updatedAt: status.updatedAt.toISOString(),
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getIssueCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.service.getIssueCategories();

      const response: ApiResponse<IssueCategoryDto[]> = {
        success: true,
        data: categories.map((category) => ({
          id: category.id,
          name: category.name,
          displayOrder: category.displayOrder,
          active: category.active,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getHubs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hubs = await this.service.getHubs();

      const response: ApiResponse<HubDto[]> = {
        success: true,
        data: hubs.map((hub) => ({
          id: hub.id,
          name: hub.name,
          city: hub.city,
          state: hub.state,
          active: hub.active,
          createdAt: hub.createdAt.toISOString(),
          updatedAt: hub.updatedAt.toISOString(),
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getVehicleModels = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const models = await this.service.getVehicleModels();

      const response: ApiResponse<VehicleModelDto[]> = {
        success: true,
        data: models.map((model) => ({
          id: model.id,
          modelCode: model.modelCode,
          displayName: model.displayName,
          manufacturer: model.manufacturer,
          vehicleType: (model as typeof model & { vehicleType?: string | null }).vehicleType ?? null,
          active: model.active,
          createdAt: model.createdAt.toISOString(),
          updatedAt: model.updatedAt.toISOString(),
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
