import { AttachmentExecutorImpl } from './AttachmentExecutorImpl';
import type { AttachmentExecutor } from './AttachmentExecutor';

export type { AttachmentExecutor, CaptureContext, RawCapturedPhoto } from './AttachmentExecutor';
export { AttachmentExecutorImpl } from './AttachmentExecutorImpl';

/** Single shared instance - unlike a repository, there's nothing to switch between mock/production
 * for (it orchestrates flow, not backend access; `AttachmentsRepository` underneath it is what
 * already switches). */
export const attachmentExecutor: AttachmentExecutor = new AttachmentExecutorImpl();
