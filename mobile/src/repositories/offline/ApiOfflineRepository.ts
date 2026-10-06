import type { QueuedOperation } from '@/models';
import type { EnqueueOperationInput, OfflineRepository } from './OfflineRepository';

/**
 * The future production implementation - local, durable persistence (e.g. a bundled database),
 * not a backend call. Deliberately inert until that storage layer is chosen; every method throws
 * so nothing silently pretends to persist data it doesn't.
 */
export class ApiOfflineRepository implements OfflineRepository {
  async getQueue(): Promise<QueuedOperation[]> {
    throw new Error('ApiOfflineRepository is not implemented yet.');
  }

  async enqueue(_input: EnqueueOperationInput): Promise<QueuedOperation> {
    throw new Error('ApiOfflineRepository is not implemented yet.');
  }

  async updateOperation(_id: string, _patch: Partial<QueuedOperation>): Promise<QueuedOperation | null> {
    throw new Error('ApiOfflineRepository is not implemented yet.');
  }

  async removeOperation(_id: string): Promise<void> {
    throw new Error('ApiOfflineRepository is not implemented yet.');
  }
}
