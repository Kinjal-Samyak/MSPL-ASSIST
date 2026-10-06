import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type { BootstrapSetupResponseDto } from "../dto/setup.dto";
import { SetupService } from "../services/setup.service";

export class SetupController {
  constructor(private readonly service: SetupService = new SetupService()) {}

  bootstrap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.bootstrap(req.body);
      const response: ApiResponse<BootstrapSetupResponseDto> = {
        success: true,
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };
}

