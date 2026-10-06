import type { AppNotification, ConnectivityState, QueuedOperation, SyncState, TechnicianProfile } from '@/models';

/**
 * The single orchestration layer for platform-wide concerns - connectivity, offline queue, sync,
 * notifications, profile - the same role `JobWorkspaceFacade` plays for job-specific concerns.
 * Screens/hooks depend on this, never on `ConnectivityService`/`OfflineManager`/`SyncManager`/
 * `NotificationManager`/`ProfileRepository` directly.
 *
 * What it must never do: decide business rules, run a workflow, calculate status, or make
 * permission decisions. It only coordinates the platform services beneath it.
 */
export interface PlatformFacade {
  getConnectivityState(): Promise<ConnectivityState>;
  subscribeToConnectivity(listener: (state: ConnectivityState) => void): () => void;

  getOfflineQueue(): Promise<QueuedOperation[]>;
  queueOfflineOperation(type: string, payload: Record<string, unknown>): Promise<QueuedOperation>;

  getSyncState(): Promise<SyncState>;
  triggerSync(): Promise<SyncState>;
  subscribeToSync(listener: (state: SyncState) => void): () => void;

  getNotifications(): Promise<AppNotification[]>;
  getUnreadNotificationCount(): Promise<number>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(): Promise<void>;

  getProfile(): Promise<TechnicianProfile>;
}
