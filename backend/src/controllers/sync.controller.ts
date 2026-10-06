import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type { PersistedSyncRunDto, SyncRunSummaryDto, SyncStatusDto } from "../dto/sync.dto";
import { OPERATIONAL_SYNC_HISTORY_LIMIT } from "../constants/operational-data.constants";
import type { Scheduler } from "../interfaces/excel-sync.interface";
import { validateSyncHistoryQuery } from "../validators/sync.validator";
import { syncService, type SyncService } from "../services/sync.service";
import { getSyncScheduler } from "../excel/sync-runtime";

export class SyncController {
  constructor(
    private readonly service: SyncService = syncService,
    private readonly schedulerProvider: () => Scheduler = getSyncScheduler
  ) {}

  runSync = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.service.runSync({
        trigger: "MANUAL",
        nextSync: this.schedulerProvider().getNextRunAt(),
      });
      const response: ApiResponse<SyncRunSummaryDto> = {
        success: true,
        data: summary,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduler = this.schedulerProvider();
      const status = await this.service.getStatus(scheduler.getNextRunAt());
      const response: ApiResponse<SyncStatusDto> = {
        success: true,
        data: status,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = validateSyncHistoryQuery(req.query);
      const cappedLimit = Math.min(query.limit, OPERATIONAL_SYNC_HISTORY_LIMIT);
      const history = await this.service.getHistory(cappedLimit);
      const response: ApiResponse<PersistedSyncRunDto[]> = {
        success: true,
        data: history,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
