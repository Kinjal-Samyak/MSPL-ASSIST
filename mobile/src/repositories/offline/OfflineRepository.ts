import type { QueuedOperation } from '@/models';

export interface EnqueueOperationInput {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Persistence for the offline queue only - same shape as every other repository. Knows nothing
 * about what an operation means or how to execute it; that's `OfflineManager`/`SyncManager`.
 */
export interface OfflineRepository {
  getQueue(): Promise<QueuedOperation[]>;
  enqueue(input: EnqueueOperationInput): Promise<QueuedOperation>;
  updateOperation(id: string, patch: Partial<QueuedOperation>): Promise<QueuedOperation | null>;
  removeOperation(id: string): Promise<void>;
}
