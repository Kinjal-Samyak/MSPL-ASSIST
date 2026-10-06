/**
 * Presentation/infra models for the Offline + Synchronisation framework. Deliberately opaque
 * about *what* an operation does - `type`/`payload` are just strings/data the framework carries
 * and later hands back for a caller to replay; the offline framework itself never interprets or
 * validates their business meaning.
 */
export type QueuedOperationStatus = 'PENDING' | 'SYNCING' | 'FAILED';

export interface QueuedOperation {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: QueuedOperationStatus;
  lastError: string | null;
}

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'FAILED';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}
