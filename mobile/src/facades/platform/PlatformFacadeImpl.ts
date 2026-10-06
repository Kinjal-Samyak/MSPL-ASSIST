import { connectivityService, type ConnectivityService } from '@/platform/ConnectivityServiceInstance';
import { notificationManager, type NotificationManager } from '@/platform/NotificationManagerInstance';
import { offlineManager, type OfflineManager } from '@/platform/OfflineManagerInstance';
import { syncManager, type SyncManager } from '@/platform/SyncManagerInstance';
import { profileRepository, type ProfileRepository } from '@/repositories/profile';
import type { AppNotification, ConnectivityState, QueuedOperation, SyncState, TechnicianProfile } from '@/models';
import type { PlatformFacade } from './PlatformFacade';

export class PlatformFacadeImpl implements PlatformFacade {
  constructor(
    private readonly connectivity: ConnectivityService = connectivityService,
    private readonly offline: OfflineManager = offlineManager,
    private readonly sync: SyncManager = syncManager,
    private readonly notifications: NotificationManager = notificationManager,
    private readonly profile: ProfileRepository = profileRepository
  ) {}

  async getConnectivityState(): Promise<ConnectivityState> {
    return this.connectivity.getState();
  }

  subscribeToConnectivity(listener: (state: ConnectivityState) => void): () => void {
    return this.connectivity.subscribe(listener);
  }

  async getOfflineQueue(): Promise<QueuedOperation[]> {
    return this.offline.getQueue();
  }

  async queueOfflineOperation(type: string, payload: Record<string, unknown>): Promise<QueuedOperation> {
    return this.offline.queueOperation(type, payload);
  }

  async getSyncState(): Promise<SyncState> {
    return this.sync.getState();
  }

  async triggerSync(): Promise<SyncState> {
    return this.sync.sync();
  }

  subscribeToSync(listener: (state: SyncState) => void): () => void {
    return this.sync.subscribe(listener);
  }

  async getNotifications(): Promise<AppNotification[]> {
    return this.notifications.getNotifications();
  }

  async getUnreadNotificationCount(): Promise<number> {
    return this.notifications.getUnreadCount();
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.notifications.markAsRead(id);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.notifications.markAllAsRead();
  }

  async getProfile(): Promise<TechnicianProfile> {
    return this.profile.getProfile();
  }
}
