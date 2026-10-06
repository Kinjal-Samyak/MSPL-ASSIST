import type { NotificationRepository } from '@/repositories/notifications';
import type { AppNotification } from '@/models';
import { NotificationManagerImpl } from '../NotificationManagerImpl';

function buildFakeRepository(notifications: AppNotification[]): NotificationRepository {
  return {
    getNotifications: jest.fn().mockResolvedValue(notifications),
    markAsRead: jest.fn().mockResolvedValue(undefined),
    markAllAsRead: jest.fn().mockResolvedValue(undefined),
  };
}

describe('NotificationManagerImpl', () => {
  it('getUnreadCount derives the count from the repository list rather than trusting a stored counter', async () => {
    const repository = buildFakeRepository([
      { id: '1', isRead: false } as AppNotification,
      { id: '2', isRead: true } as AppNotification,
      { id: '3', isRead: false } as AppNotification,
    ]);
    const manager = new NotificationManagerImpl(repository);

    const count = await manager.getUnreadCount();

    expect(count).toBe(2);
  });

  it('markAsRead and markAllAsRead delegate directly to the repository', async () => {
    const repository = buildFakeRepository([]);
    const manager = new NotificationManagerImpl(repository);

    await manager.markAsRead('1');
    await manager.markAllAsRead();

    expect(repository.markAsRead).toHaveBeenCalledWith('1');
    expect(repository.markAllAsRead).toHaveBeenCalledTimes(1);
  });
});
