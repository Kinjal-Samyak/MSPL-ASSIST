import type { QueuedOperation } from '@/models';

/** Manages the offline queue's lifecycle above `OfflineRepository` - queueing, listing, retrying,
 * and clearing entries. No business rules: it doesn't know what any operation's `type`/`payload`
 * mean, only how to track its state. */
export interface OfflineManager {
  getQueue(): Promise<QueuedOperation[]>;
  queueOperation(type: string, payload: Record<string, unknown>): Promise<QueuedOperation>;
  markSyncing(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  removeOperation(id: string): Promise<void>;
}
