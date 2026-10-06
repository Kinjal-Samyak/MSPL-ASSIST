import type { AppNotification } from '@/models';

/** Orchestrates `NotificationRepository` for the Notification Center/Badge. No push-provider
 * registration lives here (Firebase/OneSignal are explicitly out of scope this phase). */
export interface NotificationManager {
  getNotifications(): Promise<AppNotification[]>;
  getUnreadCount(): Promise<number>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}
