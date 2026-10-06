import { notificationRepository, type NotificationRepository } from '@/repositories/notifications';
import type { AppNotification } from '@/models';
import type { NotificationManager } from './NotificationManager';

export class NotificationManagerImpl implements NotificationManager {
  constructor(private readonly notifications: NotificationRepository = notificationRepository) {}

  async getNotifications(): Promise<AppNotification[]> {
    return this.notifications.getNotifications();
  }

  async getUnreadCount(): Promise<number> {
    const notifications = await this.notifications.getNotifications();
    return notifications.filter((item) => !item.isRead).length;
  }

  async markAsRead(id: string): Promise<void> {
    await this.notifications.markAsRead(id);
  }

  async markAllAsRead(): Promise<void> {
    await this.notifications.markAllAsRead();
  }
}
