import type { AddAttachmentInput, Attachment } from '@/models';
import type { AttachmentsRepository } from './AttachmentsRepository';

/**
 * The future production implementation. Deliberately inert - no Axios, no endpoints, no backend
 * calls, no upload logic. Implement against `apiClient` (see `@/api`), mapping onto the real
 * `TicketAttachment` contract, once the backend exposes technician-facing attachment endpoints.
 */
export class ApiAttachmentsRepository implements AttachmentsRepository {
  async getAttachments(_jobId: string): Promise<Attachment[]> {
    throw new Error('ApiAttachmentsRepository is not implemented yet.');
  }

  async addAttachment(_input: AddAttachmentInput): Promise<Attachment> {
    throw new Error('ApiAttachmentsRepository is not implemented yet.');
  }
}
