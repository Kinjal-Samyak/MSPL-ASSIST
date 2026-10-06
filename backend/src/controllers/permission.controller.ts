import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type { PermissionMatrixEntryDto } from "../dto/permission.dto";
import { permissionService } from "../services/permission.service";

export class PermissionController {
  getMatrix = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await permissionService.getMatrix();
      const response: ApiResponse<PermissionMatrixEntryDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateMatrix = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await permissionService.updateMatrix(req.body);
      const response: ApiResponse<PermissionMatrixEntryDto[]> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
