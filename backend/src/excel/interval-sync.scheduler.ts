import type { Scheduler, SchedulerJobDefinition } from "../interfaces/excel-sync.interface";
import { logger } from "../utils/logger";

export class IntervalSyncScheduler implements Scheduler {
  private timer: NodeJS.Timeout | null = null;
  private nextRunAt: string | null = null;

  schedule(job: SchedulerJobDefinition): void {
    this.stop();
    this.nextRunAt = new Date(Date.now() + job.intervalMs).toISOString();

    this.timer = setInterval(() => {
      void job
        .execute()
        .catch((error) => {
          logger.error({
            scope: "excel-sync",
            event: "Sync Failed",
            reason: error instanceof Error ? error.message : "Unknown scheduler execution error.",
          });
        })
        .finally(() => {
          this.nextRunAt = new Date(Date.now() + job.intervalMs).toISOString();
        });
    }, job.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.nextRunAt = null;
  }

  getNextRunAt(): string | null {
    return this.nextRunAt;
  }
}
