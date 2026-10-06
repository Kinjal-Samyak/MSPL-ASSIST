import { NotificationManagerImpl } from './NotificationManagerImpl';
import type { NotificationManager } from './NotificationManager';

export type { NotificationManager } from './NotificationManager';

export const notificationManager: NotificationManager = new NotificationManagerImpl();
