import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  CustomerSearchResponseDto,
  CustomerVehicleDto,
  IssueSubcategoryLookupDto,
  ServiceTlLookupDto,
  TechnicianLookupDto,
} from "../dto/lookup.dto";
import { LookupService } from "../services/lookup.service";

export class LookupController {
  private readonly service: LookupService;

  constructor(service?: LookupService) {
    this.service = service ?? new LookupService();
  }

  searchCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.searchCustomers(req.query);

      const response: ApiResponse<CustomerSearchResponseDto> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getCustomerVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerVehicles(req.params.customerId);

      const response: ApiResponse<CustomerVehicleDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTechnicians = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTechnicians(req.query);

      const response: ApiResponse<TechnicianLookupDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getServiceTls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getServiceTls();

      const response: ApiResponse<ServiceTlLookupDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getIssueSubcategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getIssueSubcategories(req.query);

      const response: ApiResponse<IssueSubcategoryLookupDto[]> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
