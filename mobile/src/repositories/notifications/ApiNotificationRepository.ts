import type { AppNotification } from '@/models';
import type { NotificationRepository } from './NotificationRepository';

/** The future production implementation. Deliberately inert - no Axios, no endpoints, and
 * explicitly not a push provider integration (Firebase/OneSignal are out of scope). Implement
 * against `apiClient` once the backend exposes a notifications list endpoint. */
export class ApiNotificationRepository implements NotificationRepository {
  async getNotifications(): Promise<AppNotification[]> {
    throw new Error('ApiNotificationRepository is not implemented yet.');
  }

  async markAsRead(_id: string): Promise<void> {
    throw new Error('ApiNotificationRepository is not implemented yet.');
  }

  async markAllAsRead(): Promise<void> {
    throw new Error('ApiNotificationRepository is not implemented yet.');
  }
}
