import { IntervalSyncScheduler } from "./interval-sync.scheduler";
import { NoopSyncScheduler } from "./excel-sync.scheduler";
import type { Scheduler } from "../interfaces/excel-sync.interface";
import { syncService } from "../services/sync.service";
import { operationalDataService } from "../services/operational-data.service";
import { logger } from "../utils/logger";
import { prismaClient } from "../database";

let scheduler: Scheduler = new NoopSyncScheduler();
const DATASET_SCHEDULER_LOCK_KEY = 88001122;
let hasSchedulerLock = false;

function intervalMsByMode(
  mode: "FIVE_MINUTES" | "FIFTEEN_MINUTES" | "THIRTY_MINUTES" | "HOURLY" | "DAILY" | "MANUAL"
): number | null {
  if (mode === "FIVE_MINUTES") {
    return 5 * 60 * 1000;
  }

  if (mode === "FIFTEEN_MINUTES") {
    return 15 * 60 * 1000;
  }

  if (mode === "THIRTY_MINUTES") {
    return 30 * 60 * 1000;
  }

  if (mode === "HOURLY") {
    return 60 * 60 * 1000;
  }
  if (mode === "DAILY") {
    return 24 * 60 * 60 * 1000;
  }

  return null;
}

async function tryAcquireSchedulerLock(): Promise<boolean> {
  if (process.env.NODE_ENV === "test") {
    return true;
  }

  try {
    const result = await prismaClient.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${DATASET_SCHEDULER_LOCK_KEY}) AS locked
    `;
    const locked = result[0]?.locked === true;
    hasSchedulerLock = locked;
    return locked;
  } catch {
    return false;
  }
}

async function releaseSchedulerLock(): Promise<void> {
  if (!hasSchedulerLock) {
    return;
  }

  try {
    await prismaClient.$queryRaw`SELECT pg_advisory_unlock(${DATASET_SCHEDULER_LOCK_KEY})`;
  } finally {
    hasSchedulerLock = false;
  }
}

export async function startSyncScheduler(): Promise<Scheduler> {
  try {
    const lockAcquired = await tryAcquireSchedulerLock();
    if (!lockAcquired) {
      scheduler = new NoopSyncScheduler();
      logger.info({
        scope: "operational-dataset-scheduler",
        event: "Scheduler Lock Not Acquired",
        reason: "Another scheduler instance is already active.",
      });
      return scheduler;
    }

    const runtime = await operationalDataService.getSyncRuntimeConfiguration();
    const mode = runtime.config.scheduler.mode;
    if (!runtime.config.scheduler.enabled || mode === "MANUAL") {
      scheduler = new NoopSyncScheduler();
      logger.info({
        scope: "operational-dataset-scheduler",
        event: "Scheduler Disabled",
        mode,
      });
      return scheduler;
    }

    const intervalMs = intervalMsByMode(mode);
    if (!intervalMs) {
      scheduler = new NoopSyncScheduler();
      return scheduler;
    }

    const intervalScheduler = new IntervalSyncScheduler();
    intervalScheduler.schedule({
      id: "excel-sync-job",
      intervalMs,
      execute: async () => {
        await syncService.runSync({
          trigger: "SCHEDULER",
          nextSync: intervalScheduler.getNextRunAt(),
        });
      },
    });
    scheduler = intervalScheduler;
    logger.info({
      scope: "operational-dataset-scheduler",
      event: "Scheduler Started",
      mode,
      intervalMs,
    });
    return scheduler;
  } catch (error) {
    scheduler = new NoopSyncScheduler();
    logger.error({
      scope: "operational-dataset-scheduler",
      event: "Scheduler Initialization Failed",
      reason: error instanceof Error ? error.message : "Unknown initialization error.",
    });
    return scheduler;
  }
}

export function getSyncScheduler(): Scheduler {
  return scheduler;
}

export async function stopSyncScheduler(): Promise<void> {
  scheduler.stop();
  scheduler = new NoopSyncScheduler();
  await releaseSchedulerLock();
}
