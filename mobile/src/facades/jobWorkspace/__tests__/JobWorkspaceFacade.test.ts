import { queryClient } from '@/services';
import type { AttachmentExecutor, RawCapturedPhoto } from '@/executors/attachmentExecutor';
import type { JobDetailsRepository } from '@/repositories/jobDetails';
import type { WorkflowRepository } from '@/repositories/workflow';
import type { Attachment, JobDetails, WorkflowAction, WorkflowExecutionResult } from '@/models';
import { JobWorkspaceFacadeImpl } from '../JobWorkspaceFacadeImpl';

const JOB_ID = 'job-1';

function buildFakes() {
  const jobDetails: JobDetailsRepository = {
    getJobDetails: jest.fn().mockResolvedValue({ jobId: JOB_ID } as unknown as JobDetails),
  };
  const workflow: WorkflowRepository = {
    getAvailableActions: jest.fn().mockResolvedValue([] as WorkflowAction[]),
    executeAction: jest.fn(),
  };
  const attachments: AttachmentExecutor = {
    processCapturedPhoto: jest.fn(),
    pickFromGallery: jest.fn(),
    listAttachments: jest.fn().mockResolvedValue([] as Attachment[]),
  };
  return { jobDetails, workflow, attachments };
}

describe('JobWorkspaceFacadeImpl', () => {
  beforeEach(() => {
    jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loadWorkspace fetches job details and available actions in parallel and merges them', async () => {
    const { jobDetails, workflow, attachments } = buildFakes();
    const facade = new JobWorkspaceFacadeImpl(jobDetails, workflow, attachments);

    const result = await facade.loadWorkspace(JOB_ID);

    expect(jobDetails.getJobDetails).toHaveBeenCalledWith(JOB_ID);
    expect(workflow.getAvailableActions).toHaveBeenCalledWith(JOB_ID);
    expect(result).toEqual({ job: { jobId: JOB_ID }, availableActions: [] });
  });

  it('executeAction relays the repository result and refreshes dependent caches on success', async () => {
    const { jobDetails, workflow, attachments } = buildFakes();
    const successResult: WorkflowExecutionResult = { success: true } as WorkflowExecutionResult;
    (workflow.executeAction as jest.Mock).mockResolvedValue(successResult);
    const facade = new JobWorkspaceFacadeImpl(jobDetails, workflow, attachments);

    const result = await facade.executeAction(JOB_ID, 'action-1');

    expect(workflow.executeAction).toHaveBeenCalledWith(JOB_ID, 'action-1');
    expect(result).toBe(successResult);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['jobWorkspace', JOB_ID] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['jobs'] });
  });

  it('executeAction does not refresh any cache when the action fails', async () => {
    const { jobDetails, workflow, attachments } = buildFakes();
    const failureResult: WorkflowExecutionResult = { success: false } as WorkflowExecutionResult;
    (workflow.executeAction as jest.Mock).mockResolvedValue(failureResult);
    const facade = new JobWorkspaceFacadeImpl(jobDetails, workflow, attachments);

    const result = await facade.executeAction(JOB_ID, 'action-1');

    expect(result).toBe(failureResult);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('captureAttachmentFromCamera delegates to the executor and refreshes the attachments cache', async () => {
    const { jobDetails, workflow, attachments } = buildFakes();
    const captured: Attachment = { id: 'att-1' } as Attachment;
    (attachments.processCapturedPhoto as jest.Mock).mockResolvedValue(captured);
    const facade = new JobWorkspaceFacadeImpl(jobDetails, workflow, attachments);
    const photo: RawCapturedPhoto = { uri: 'file://x.jpg', mimeType: 'image/jpeg', fileSize: 1, fileName: 'x.jpg' };

    const result = await facade.captureAttachmentFromCamera(JOB_ID, 'GENERAL', photo);

    expect(attachments.processCapturedPhoto).toHaveBeenCalledWith({ jobId: JOB_ID, purpose: 'GENERAL' }, photo);
    expect(result).toBe(captured);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['jobWorkspaceAttachments', JOB_ID] });
  });

  it('captureAttachmentsFromGallery does not refresh the cache when the user cancels (empty result)', async () => {
    const { jobDetails, workflow, attachments } = buildFakes();
    (attachments.pickFromGallery as jest.Mock).mockResolvedValue([]);
    const facade = new JobWorkspaceFacadeImpl(jobDetails, workflow, attachments);

    const result = await facade.captureAttachmentsFromGallery(JOB_ID, 'GENERAL');

    expect(result).toEqual([]);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
