import { logger } from "../utils/logger";
import type { SyncLogger } from "../interfaces/excel-sync.interface";

export class ExcelSyncLogger implements SyncLogger {
  info(message: string | Record<string, unknown>): void {
    logger.info(message);
  }

  error(message: string | Record<string, unknown>): void {
    logger.error(message);
  }
}
