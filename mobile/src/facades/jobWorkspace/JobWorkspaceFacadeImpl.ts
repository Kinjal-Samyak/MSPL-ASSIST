import { attachmentExecutor, type AttachmentExecutor, type RawCapturedPhoto } from '@/executors/attachmentExecutor';
import { jobDetailsRepository, type JobDetailsRepository } from '@/repositories/jobDetails';
import { workflowRepository, type WorkflowRepository } from '@/repositories/workflow';
import { queryClient } from '@/services';
import type { Attachment, AttachmentPurpose, WorkflowExecutionResult } from '@/models';
import type { JobWorkspaceData, JobWorkspaceFacade } from './JobWorkspaceFacade';

export class JobWorkspaceFacadeImpl implements JobWorkspaceFacade {
  constructor(
    private readonly jobDetails: JobDetailsRepository = jobDetailsRepository,
    private readonly workflow: WorkflowRepository = workflowRepository,
    private readonly attachments: AttachmentExecutor = attachmentExecutor
  ) {}

  async loadWorkspace(jobId: string): Promise<JobWorkspaceData> {
    const [job, availableActions] = await Promise.all([
      this.jobDetails.getJobDetails(jobId),
      this.workflow.getAvailableActions(jobId),
    ]);
    return { job, availableActions };
  }

  async executeAction(jobId: string, actionId: string): Promise<WorkflowExecutionResult> {
    const result = await this.workflow.executeAction(jobId, actionId);
    if (result.success) {
      await this.refresh(jobId);
    }
    return result;
  }

  async getAttachments(jobId: string): Promise<Attachment[]> {
    return this.attachments.listAttachments(jobId);
  }

  async captureAttachmentFromCamera(jobId: string, purpose: AttachmentPurpose, photo: RawCapturedPhoto): Promise<Attachment> {
    const attachment = await this.attachments.processCapturedPhoto({ jobId, purpose }, photo);
    await this.refreshAttachments(jobId);
    return attachment;
  }

  async captureAttachmentsFromGallery(jobId: string, purpose: AttachmentPurpose): Promise<Attachment[]> {
    const attachments = await this.attachments.pickFromGallery({ jobId, purpose });
    if (attachments.length > 0) {
      await this.refreshAttachments(jobId);
    }
    return attachments;
  }

  /** "Refresh Job Details after successful actions" + "Refresh dependent modules" - both are
   * pure cache invalidation (React Query re-fetches any mounted query with a matching key), never
   * a direct write to any screen's state. Nothing here decides what changed - it only asks each
   * module to re-ask its own repository. */
  private async refresh(jobId: string): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobWorkspace', jobId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    ]);
  }

  private async refreshAttachments(jobId: string): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['jobWorkspaceAttachments', jobId] });
  }
}
