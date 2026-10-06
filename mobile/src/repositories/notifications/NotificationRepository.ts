import type { AppNotification } from '@/models';

/** Same shape as every other repository. Mock returns development data; the real implementation
 * still won't be a push provider (Firebase/OneSignal are explicitly out of scope) - just a
 * backend list endpoint, whenever one exists. */
export interface NotificationRepository {
  getNotifications(): Promise<AppNotification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}
