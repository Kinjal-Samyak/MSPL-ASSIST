import type { QueuedOperation } from '@/models';
import type { EnqueueOperationInput, OfflineRepository } from './OfflineRepository';

/**
 * TEMPORARY. Holds the queue in memory for the lifetime of the app session - enough to exercise
 * the framework (queue, list, retry, remove) without a real local database. Delete alongside the
 * mock-only branch of `index.ts` once `ApiOfflineRepository` is real.
 */
function generateId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MockOfflineRepository implements OfflineRepository {
  private queue: QueuedOperation[] = [];

  async getQueue(): Promise<QueuedOperation[]> {
    return [...this.queue];
  }

  async enqueue(input: EnqueueOperationInput): Promise<QueuedOperation> {
    const operation: QueuedOperation = {
      id: generateId(),
      type: input.type,
      payload: input.payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING',
      lastError: null,
    };
    this.queue.push(operation);
    return operation;
  }

  async updateOperation(id: string, patch: Partial<QueuedOperation>): Promise<QueuedOperation | null> {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index === -1) return null;
    this.queue[index] = { ...this.queue[index], ...patch };
    return this.queue[index];
  }

  async removeOperation(id: string): Promise<void> {
    this.queue = this.queue.filter((item) => item.id !== id);
  }
}
