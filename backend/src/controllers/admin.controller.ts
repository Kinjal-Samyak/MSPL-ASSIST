import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  AdminDashboardDto,
  AdminHubDto,
  AdminMutationResponseDto,
  AdminPermissionDto,
  AdminRoleDto,
  AdminSettingDto,
  AdminUserDto,
  AdminUserListResponseDto,
} from "../dto/admin.dto";
import type { AdminActorContext } from "../services/admin.service";
import { AdminService } from "../services/admin.service";

function toActor(req: Request): AdminActorContext {
  return {
    userId: req.authUser?.userId,
    name: req.authUser?.email,
    role: req.authUser?.role,
  };
}

export class AdminController {
  private readonly service: AdminService;

  constructor(service?: AdminService) {
    this.service = service ?? new AdminService();
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDashboard(req.header("x-user-role"));
      const response: ApiResponse<AdminDashboardDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getUsers(req.header("x-user-role"), req.query);
      const response: ApiResponse<AdminUserListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createUser(req.header("x-user-role"), req.body, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getUserById(req.header("x-user-role"), req.params.userId);
      const response: ApiResponse<AdminUserDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateUser(req.header("x-user-role"), req.params.userId, req.body, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  activateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.activateUser(req.header("x-user-role"), req.params.userId, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deactivateUser(req.header("x-user-role"), req.params.userId, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.deleteUser(req.header("x-user-role"), req.params.userId, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  resetUserPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.resetUserPassword(req.header("x-user-role"), req.params.userId, req.body, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  lockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.lockUser(req.header("x-user-role"), req.params.userId, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  unlockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.unlockUser(req.header("x-user-role"), req.params.userId, toActor(req));
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  exportUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.exportUsers(req.header("x-user-role"), toActor(req));
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getRoles(req.header("x-user-role"));
      const response: ApiResponse<AdminRoleDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getPermissions(req.header("x-user-role"));
      const response: ApiResponse<AdminPermissionDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getHubs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getHubs(req.header("x-user-role"));
      const response: ApiResponse<AdminHubDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createHub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createHub(req.header("x-user-role"), req.body);
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateHub = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateHub(req.header("x-user-role"), req.params.hubId, req.body);
      const response: ApiResponse<AdminMutationResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSettings(req.header("x-user-role"));
      const response: ApiResponse<AdminSettingDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateSettings(req.header("x-user-role"), req.body);
      const response: ApiResponse<AdminSettingDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
