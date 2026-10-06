import type { AddAttachmentInput, Attachment } from '@/models';
import type { AttachmentsRepository } from './AttachmentsRepository';

/**
 * TEMPORARY. The only concrete `AttachmentsRepository` used while there is no backend to talk to.
 * Holds attachments in memory per job and simulates a real Upload Queue lifecycle (QUEUED ->
 * UPLOADING with progress ticks -> UPLOADED, occasionally FAILED so the failure UI is genuinely
 * reachable) so `useEvidenceGallery`'s polling has real state changes to observe. Delete alongside
 * the mock-only branch of `index.ts` once `ApiAttachmentsRepository` is real.
 */
const LIST_LATENCY_MS = 200;
const ADD_LATENCY_MS = 300;
const UPLOAD_TICK_MS = 400;
const UPLOAD_TICK_STEP = 25;
/** Demo-only: occasionally ends an upload in FAILED so the failure state is actually reachable
 * without needing a real network to break. Not a reliability figure of anything real. */
const SIMULATED_FAILURE_RATE = 0.15;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MockAttachmentsRepository implements AttachmentsRepository {
  private readonly attachmentsByJobId = new Map<string, Attachment[]>();

  async getAttachments(jobId: string): Promise<Attachment[]> {
    await wait(LIST_LATENCY_MS);
    return [...(this.attachmentsByJobId.get(jobId) ?? [])];
  }

  async addAttachment(input: AddAttachmentInput): Promise<Attachment> {
    await wait(ADD_LATENCY_MS);

    const attachment: Attachment = {
      id: generateId(),
      type: input.type,
      purpose: input.purpose,
      mimeType: input.mimeType,
      thumbnailUrl: input.localUri,
      fullImageUrl: input.localUri,
      fileName: input.fileName,
      fileSize: input.fileSize,
      capturedAt: new Date().toISOString(),
      capturedBy: null,
      status: 'QUEUED',
      uploadProgress: 0,
      source: input.source,
    };

    const list = this.attachmentsByJobId.get(input.jobId) ?? [];
    list.push(attachment);
    this.attachmentsByJobId.set(input.jobId, list);

    this.simulateUpload(input.jobId, attachment.id);

    return attachment;
  }

  private simulateUpload(jobId: string, attachmentId: string): void {
    this.patchAttachment(jobId, attachmentId, { status: 'UPLOADING', uploadProgress: 0 });

    let progress = 0;
    const interval = setInterval(() => {
      progress += UPLOAD_TICK_STEP;

      if (progress >= 100) {
        clearInterval(interval);
        const failed = Math.random() < SIMULATED_FAILURE_RATE;
        this.patchAttachment(jobId, attachmentId, {
          status: failed ? 'FAILED' : 'UPLOADED',
          uploadProgress: failed ? progress - UPLOAD_TICK_STEP : 100,
        });
        return;
      }

      this.patchAttachment(jobId, attachmentId, { uploadProgress: progress });
    }, UPLOAD_TICK_MS);
  }

  private patchAttachment(jobId: string, attachmentId: string, patch: Partial<Attachment>): void {
    const list = this.attachmentsByJobId.get(jobId);
    if (!list) return;
    const index = list.findIndex((item) => item.id === attachmentId);
    if (index === -1) return;
    list[index] = { ...list[index], ...patch };
  }
}
