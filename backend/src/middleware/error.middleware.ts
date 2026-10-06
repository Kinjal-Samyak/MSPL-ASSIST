import { Request, Response, NextFunction } from "express";
import { ApplicationError } from "../errors";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof ApplicationError ? err.statusCode : 500;
  const message = err instanceof ApplicationError ? err.message : "Internal server error";
  /** Structured details (e.g. INSUFFICIENT_STOCK's availableQuantity/requestedQuantity) let a
   * client branch on the failure programmatically instead of parsing the message string - only
   * surfaced when a service explicitly attached them via ApplicationError's details param. */
  const details = err instanceof ApplicationError ? err.details : undefined;

  logger.error(`${err.name}: ${err.message}`);

  res.status(statusCode).json({
    error: message,
    ...(details !== undefined ? { details } : {}),
  });
};
