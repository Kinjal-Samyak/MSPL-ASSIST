import { connectivityService, type ConnectivityService } from './ConnectivityServiceInstance';
import { offlineManager, type OfflineManager } from './OfflineManagerInstance';
import type { SyncState, SyncStatus } from '@/models';
import type { SyncManager } from './SyncManager';

/** Demo-only: simulates each queued operation being replayed against a backend that doesn't
 * exist yet. Not a reliability figure of anything real - purely so the FAILED state is reachable
 * without needing a real network to break. */
const SIMULATED_FAILURE_RATE = 0.1;
const SIMULATED_LATENCY_MS = 400;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SyncManagerImpl implements SyncManager {
  private status: SyncStatus = 'IDLE';
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners = new Set<(state: SyncState) => void>();
  private isSyncing = false;

  constructor(
    private readonly offline: OfflineManager = offlineManager,
    private readonly connectivity: ConnectivityService = connectivityService
  ) {
    this.connectivity.subscribe((connectivityState) => {
      if (connectivityState.isOnline) {
        void this.autoSync();
      }
    });
  }

  async getState(): Promise<SyncState> {
    const queue = await this.offline.getQueue();
    return {
      status: this.status,
      pendingCount: queue.filter((item) => item.status !== 'SYNCING').length,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async sync(): Promise<SyncState> {
    if (this.isSyncing) {
      return this.getState();
    }
    this.isSyncing = true;
    this.status = 'SYNCING';
    this.lastError = null;
    await this.notify();

    try {
      const queue = await this.offline.getQueue();
      const pending = queue.filter((item) => item.status !== 'SYNCING');

      for (const operation of pending) {
        await this.offline.markSyncing(operation.id);
        await wait(SIMULATED_LATENCY_MS);

        const failed = Math.random() < SIMULATED_FAILURE_RATE;
        if (failed) {
          await this.offline.markFailed(operation.id, 'Simulated sync failure.');
        } else {
          await this.offline.removeOperation(operation.id);
        }
      }

      const remaining = await this.offline.getQueue();
      const stillFailing = remaining.some((item) => item.status === 'FAILED');
      this.status = stillFailing ? 'FAILED' : 'SUCCESS';
      this.lastError = stillFailing ? 'Some operations could not be synced.' : null;
      this.lastSyncedAt = new Date().toISOString();
    } finally {
      this.isSyncing = false;
      await this.notify();
    }

    return this.getState();
  }

  /** "Trigger sync" on reconnect (Part 2) - only runs when there's something to sync. */
  private async autoSync(): Promise<void> {
    const queue = await this.offline.getQueue();
    if (queue.length > 0) {
      await this.sync();
    }
  }

  private async notify(): Promise<void> {
    const state = await this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}
