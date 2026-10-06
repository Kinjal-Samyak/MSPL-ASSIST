import type { SyncState } from '@/models';

/** Drives synchronization of whatever `OfflineManager` has queued. No business logic: it doesn't
 * decide what an operation does, only whether the attempt succeeded or failed and how many times
 * it's been retried. Real "replay this operation against the backend" execution is a future
 * per-operation-type concern outside this framework. */
export interface SyncManager {
  getState(): Promise<SyncState>;
  /** Manual sync trigger (Part 1: "Manual Sync"). */
  sync(): Promise<SyncState>;
  subscribe(listener: (state: SyncState) => void): () => void;
}
