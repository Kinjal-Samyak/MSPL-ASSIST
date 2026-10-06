import { env } from '@/config';
import { ApiAttachmentsRepository } from './ApiAttachmentsRepository';
import { MockAttachmentsRepository } from './MockAttachmentsRepository';
import type { AttachmentsRepository } from './AttachmentsRepository';

export type { AttachmentsRepository } from './AttachmentsRepository';
export { MockAttachmentsRepository } from './MockAttachmentsRepository';
export { ApiAttachmentsRepository } from './ApiAttachmentsRepository';

/** The one place that decides which `AttachmentsRepository` implementation is active - same pattern as every other repository factory in the app. */
function createAttachmentsRepository(): AttachmentsRepository {
  if (env.appEnv === 'production') {
    return new ApiAttachmentsRepository();
  }
  return new MockAttachmentsRepository();
}

export const attachmentsRepository: AttachmentsRepository = createAttachmentsRepository();
