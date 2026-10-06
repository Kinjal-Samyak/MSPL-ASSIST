import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors";
import { permissionService } from "../services/permission.service";

export function requirePermission(code: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.authUser?.role;
      if (!role) {
        throw new UnauthorizedError("Authentication is required.");
      }
      const granted = await permissionService.isGranted(role, code);
      if (!granted) {
        throw new ForbiddenError("Access denied.");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
