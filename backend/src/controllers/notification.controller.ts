import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  NotificationChannelSettingDto,
  NotificationDashboardDto,
  NotificationDto,
  NotificationListResponseDto,
  NotificationMutationResponseDto,
  NotificationTemplateDto,
} from "../dto/notification.dto";
import { NotificationService } from "../services/notification.service";

export class NotificationController {
  private readonly service: NotificationService;

  constructor(service?: NotificationService) {
    this.service = service ?? new NotificationService();
  }

  getDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDashboard();
      const response: ApiResponse<NotificationDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getNotifications(req.query);
      const response: ApiResponse<NotificationListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getNotificationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getNotificationById(req.params.notificationId);
      const response: ApiResponse<NotificationDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  sendNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.sendNotification({ ...req.body, sentById: req.authUser?.userId });
      const response: ApiResponse<NotificationMutationResponseDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.markRead(req.params.notificationId);
      const response: ApiResponse<NotificationMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.archive(req.params.notificationId);
      const response: ApiResponse<NotificationMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTemplates();
      const response: ApiResponse<NotificationTemplateDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createTemplate(req.body);
      const response: ApiResponse<NotificationTemplateDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateTemplate(req.params.templateId, req.body);
      const response: ApiResponse<NotificationTemplateDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSettings();
      const response: ApiResponse<NotificationChannelSettingDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateSettings(req.body);
      const response: ApiResponse<NotificationChannelSettingDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
