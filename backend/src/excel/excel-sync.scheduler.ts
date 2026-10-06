import type { Scheduler, SchedulerJobDefinition } from "../interfaces/excel-sync.interface";

export class NoopSyncScheduler implements Scheduler {
  private nextRunAt: string | null = null;

  schedule(_job: SchedulerJobDefinition): void {
    // Scheduler wiring is intentionally deferred for this phase.
  }

  stop(): void {
    this.nextRunAt = null;
  }

  getNextRunAt(): string | null {
    return this.nextRunAt;
  }
}
