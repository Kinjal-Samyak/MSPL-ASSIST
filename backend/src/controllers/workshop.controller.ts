import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  WorkshopAttachmentsResponseDto,
  WorkshopDashboardDto,
  WorkshopJobDetailDto,
  WorkshopJobListResponseDto,
  WorkshopMutationResponseDto,
  WorkshopPartsResponseDto,
  WorkshopTimelineResponseDto,
} from "../dto/workshop.dto";
import { WorkshopService } from "../services/workshop.service";

export class WorkshopController {
  private readonly service: WorkshopService;

  constructor(service?: WorkshopService) {
    this.service = service ?? new WorkshopService();
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDashboard();
      const response: ApiResponse<WorkshopDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getJobs(req.query);
      const response: ApiResponse<WorkshopJobListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  searchJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.searchJobs(req.query);
      const response: ApiResponse<WorkshopJobListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getJobById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getJobById(req.params.jobId);
      const response: ApiResponse<WorkshopJobDetailDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createJob(req.body);
      const response: ApiResponse<WorkshopMutationResponseDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateJob(req.params.jobId, req.body);
      const response: ApiResponse<WorkshopMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  assignJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.assignJob(req.params.jobId, req.body);
      const response: ApiResponse<WorkshopMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  startJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.startJob(req.params.jobId);
      const response: ApiResponse<WorkshopMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  completeJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.completeJob(req.params.jobId);
      const response: ApiResponse<WorkshopMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  cancelJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.cancelJob(req.params.jobId);
      const response: ApiResponse<WorkshopMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTimeline(req.params.jobId, req.query);
      const response: ApiResponse<WorkshopTimelineResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getParts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getParts(req.params.jobId, req.query);
      const response: ApiResponse<WorkshopPartsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAttachments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getAttachments(req.params.jobId, req.query);
      const response: ApiResponse<WorkshopAttachmentsResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
