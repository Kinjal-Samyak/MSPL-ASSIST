import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type { AuthResponseDto, AuthUserDto, LogoutResponseDto } from "../dto/auth.dto";
import { AuthService } from "../services/auth.service";

export class AuthController {
  private readonly service: AuthService;

  constructor(service?: AuthService) {
    this.service = service ?? new AuthService();
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      const response: ApiResponse<AuthResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.logout(req.body);
      const response: ApiResponse<LogoutResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.refresh(req.body);
      const response: ApiResponse<AuthResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCurrentUser(req.authUser?.userId);
      const response: ApiResponse<AuthUserDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

