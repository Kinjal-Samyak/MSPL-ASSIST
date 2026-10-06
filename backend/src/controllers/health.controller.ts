import { Request, Response } from "express";
import { runtimeEnvironment } from "../config/runtime-environment";

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: "ok",
    application: "MSPL Assist",
    version: "1.0.0",
    environment: runtimeEnvironment.name,
  });
};
