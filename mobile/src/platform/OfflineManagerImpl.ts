import { offlineRepository, type OfflineRepository } from '@/repositories/offline';
import type { QueuedOperation } from '@/models';
import type { OfflineManager } from './OfflineManager';

export class OfflineManagerImpl implements OfflineManager {
  constructor(private readonly offline: OfflineRepository = offlineRepository) {}

  async getQueue(): Promise<QueuedOperation[]> {
    return this.offline.getQueue();
  }

  async queueOperation(type: string, payload: Record<string, unknown>): Promise<QueuedOperation> {
    return this.offline.enqueue({ type, payload });
  }

  async markSyncing(id: string): Promise<void> {
    await this.offline.updateOperation(id, { status: 'SYNCING' });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const queue = await this.offline.getQueue();
    const current = queue.find((item) => item.id === id);
    await this.offline.updateOperation(id, {
      status: 'FAILED',
      lastError: error,
      retryCount: (current?.retryCount ?? 0) + 1,
    });
  }

  async removeOperation(id: string): Promise<void> {
    await this.offline.removeOperation(id);
  }
}
