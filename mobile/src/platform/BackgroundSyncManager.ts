/**
 * Framework only (Part 8) - no native background task is registered (no `expo-task-manager` /
 * `expo-background-fetch`). These establish the seam a real background sync would plug into
 * later; today every method is an inert placeholder that resolves immediately.
 */
export interface SyncScheduler {
  scheduleNextSync(): Promise<void>;
  cancelScheduledSync(): Promise<void>;
}

export interface RetryScheduler {
  scheduleRetry(operationId: string, attempt: number): Promise<void>;
  cancelRetry(operationId: string): Promise<void>;
}

export interface BackgroundSyncManager {
  scheduler: SyncScheduler;
  retryScheduler: RetryScheduler;
  /** Would register the OS-level background task once implemented; currently a no-op. */
  registerBackgroundSync(): Promise<void>;
  unregisterBackgroundSync(): Promise<void>;
}
