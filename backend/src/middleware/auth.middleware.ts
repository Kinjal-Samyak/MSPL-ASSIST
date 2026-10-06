import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors";
import { AuthService } from "../services/auth.service";
import type { UserRole } from "@mspl/shared-constants";

const authService = new AuthService();

function extractBearerToken(authorization: unknown): string {
  if (typeof authorization !== "string" || !authorization.trim()) {
    throw new UnauthorizedError("Authorization header is required.");
  }
  const [type, token] = authorization.split(" ");
  if (type !== "Bearer" || !token) {
    throw new UnauthorizedError("Authorization header must use Bearer token.");
  }
  return token;
}

export function requireAccessToken(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.header("authorization"));
    const verified = authService.verifyAccessToken(token);
    req.authUser = {
      userId: verified.userId,
      role: verified.role,
      email: verified.email,
    };
    if (!req.headers["x-user-role"]) {
      req.headers["x-user-role"] = verified.role;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const role = req.authUser?.role;
      if (!role || !roles.includes(role)) {
        throw new ForbiddenError("Access denied.");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
