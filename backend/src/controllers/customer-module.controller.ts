import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  CustomerActiveVehicleDto,
  CustomerDocumentResponseDto,
  CustomerListResponseDto,
  CustomerMutationResponseDto,
  CustomerProfileDto,
  CustomerRentalHistoryResponseDto,
  CustomerTimelineResponseDto,
} from "../dto/customer-module.dto";
import { CustomerModuleService } from "../services/customer-module.service";

export class CustomerModuleController {
  private readonly service: CustomerModuleService;

  constructor(service?: CustomerModuleService) {
    this.service = service ?? new CustomerModuleService();
  }

  getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomers(req.query);
      const response: ApiResponse<CustomerListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerById(req.params.customerId, req.query);
      const response: ApiResponse<CustomerProfileDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createCustomer(req.body);
      const response: ApiResponse<CustomerMutationResponseDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateCustomer(req.params.customerId, req.body);
      const response: ApiResponse<CustomerMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deactivateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deactivateCustomer(req.params.customerId, req.body);
      const response: ApiResponse<CustomerMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerTimeline(req.params.customerId, req.query);
      const response: ApiResponse<CustomerTimelineResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getRentalHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerRentalHistory(req.params.customerId, req.query);
      const response: ApiResponse<CustomerRentalHistoryResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getActiveVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerActiveVehicles(req.params.customerId);
      const response: ApiResponse<CustomerActiveVehicleDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCustomerDocuments(req.params.customerId, req.query);
      const response: ApiResponse<CustomerDocumentResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
