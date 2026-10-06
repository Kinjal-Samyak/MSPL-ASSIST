import type { AppNotification } from '@/models';
import type { NotificationRepository } from './NotificationRepository';

/** TEMPORARY. Fixed, obviously-synthetic notifications covering every supported type, held in
 * memory. Delete alongside the mock-only branch of `index.ts` once `ApiNotificationRepository` is
 * real. */
const LATENCY_MS = 300;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let notifications: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'NEW_JOB',
    title: 'New job assigned',
    message: 'A new job has been assigned to you.',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'notif-2',
    type: 'COORDINATOR_UPDATE',
    title: 'Coordinator note added',
    message: 'A coordinator left a note on one of your jobs.',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'WORKFLOW_UPDATE',
    title: 'Job status updated',
    message: 'One of your jobs moved to a new status.',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: 'notif-4',
    type: 'SYSTEM',
    title: 'App updated',
    message: 'MSPL Assist has been updated with improvements.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: 'notif-5',
    type: 'REMINDER',
    title: 'Pending job reminder',
    message: 'You have a job that has been pending for a while.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
];

export class MockNotificationRepository implements NotificationRepository {
  async getNotifications(): Promise<AppNotification[]> {
    await wait(LATENCY_MS);
    return [...notifications];
  }

  async markAsRead(id: string): Promise<void> {
    notifications = notifications.map((item) => (item.id === id ? { ...item, isRead: true } : item));
  }

  async markAllAsRead(): Promise<void> {
    notifications = notifications.map((item) => ({ ...item, isRead: true }));
  }
}
