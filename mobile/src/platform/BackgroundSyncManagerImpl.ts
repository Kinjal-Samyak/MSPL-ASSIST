import type { BackgroundSyncManager, RetryScheduler, SyncScheduler } from './BackgroundSyncManager';

/** Placeholder scheduler - logs nothing, schedules nothing, resolves immediately. A real
 * implementation would use `expo-task-manager`/`expo-background-fetch` (explicitly out of scope
 * this phase - "No native background tasks"). */
class InertSyncScheduler implements SyncScheduler {
  async scheduleNextSync(): Promise<void> {}
  async cancelScheduledSync(): Promise<void> {}
}

class InertRetryScheduler implements RetryScheduler {
  async scheduleRetry(_operationId: string, _attempt: number): Promise<void> {}
  async cancelRetry(_operationId: string): Promise<void> {}
}

export class BackgroundSyncManagerImpl implements BackgroundSyncManager {
  readonly scheduler: SyncScheduler = new InertSyncScheduler();
  readonly retryScheduler: RetryScheduler = new InertRetryScheduler();

  async registerBackgroundSync(): Promise<void> {
    // Intentionally inert - see class docstring.
  }

  async unregisterBackgroundSync(): Promise<void> {
    // Intentionally inert - see class docstring.
  }
}
