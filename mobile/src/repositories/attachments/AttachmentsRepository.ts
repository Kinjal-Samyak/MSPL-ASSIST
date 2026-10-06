import type { AddAttachmentInput, Attachment } from '@/models';

/**
 * The single abstraction for evidence persistence - same shape as every other repository in the
 * app. Only `AttachmentExecutor` is meant to call this directly (see Part 0's architecture); it
 * knows nothing about capture flow, validation, camera, or gallery - only how to list and add
 * attachments for a job.
 */
export interface AttachmentsRepository {
  getAttachments(jobId: string): Promise<Attachment[]>;
  addAttachment(input: AddAttachmentInput): Promise<Attachment>;
}
