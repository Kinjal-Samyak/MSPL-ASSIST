import { env } from '@/config';
import { ApiOfflineRepository } from './ApiOfflineRepository';
import { MockOfflineRepository } from './MockOfflineRepository';
import type { OfflineRepository } from './OfflineRepository';

export type { OfflineRepository, EnqueueOperationInput } from './OfflineRepository';
export { MockOfflineRepository } from './MockOfflineRepository';
export { ApiOfflineRepository } from './ApiOfflineRepository';

function createOfflineRepository(): OfflineRepository {
  if (env.appEnv === 'production') {
    return new ApiOfflineRepository();
  }
  return new MockOfflineRepository();
}

export const offlineRepository: OfflineRepository = createOfflineRepository();
