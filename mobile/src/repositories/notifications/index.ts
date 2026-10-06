import { env } from '@/config';
import { ApiNotificationRepository } from './ApiNotificationRepository';
import { MockNotificationRepository } from './MockNotificationRepository';
import type { NotificationRepository } from './NotificationRepository';

export type { NotificationRepository } from './NotificationRepository';
export { MockNotificationRepository } from './MockNotificationRepository';
export { ApiNotificationRepository } from './ApiNotificationRepository';

function createNotificationRepository(): NotificationRepository {
  if (env.appEnv === 'production') {
    return new ApiNotificationRepository();
  }
  return new MockNotificationRepository();
}

export const notificationRepository: NotificationRepository = createNotificationRepository();
