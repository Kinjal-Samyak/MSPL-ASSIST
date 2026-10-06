import { attachmentExecutor } from '@/executors/attachmentExecutor';
import { MockJobDetailsRepository } from '@/repositories/jobDetails';
import { MockWorkflowRepository } from '@/repositories/workflow';
import { JobWorkspaceFacadeImpl } from '../JobWorkspaceFacadeImpl';

/**
 * Exercises the real Mock repositories together (not fakes) - the same wiring
 * `jobWorkspaceFacade` uses in the app today - to confirm the facade's orchestration holds up
 * against actual repository contracts, not just hand-written stand-ins.
 */
describe('JobWorkspaceFacade integration (Mock repositories)', () => {
  it('loads a real job workspace end to end and can execute the one available action', async () => {
    const facade = new JobWorkspaceFacadeImpl(new MockJobDetailsRepository(), new MockWorkflowRepository(), attachmentExecutor);

    const workspace = await facade.loadWorkspace('job-123');

    expect(workspace.job).toBeDefined();
    expect(workspace.availableActions).toHaveLength(1);
    expect(workspace.availableActions[0].id).toBe('acknowledge');

    const executionResult = await facade.executeAction('job-123', workspace.availableActions[0].id);

    expect(executionResult.success).toBe(true);
  });

  it('lists attachments for a job via the real attachment executor without throwing', async () => {
    const facade = new JobWorkspaceFacadeImpl(new MockJobDetailsRepository(), new MockWorkflowRepository(), attachmentExecutor);

    const attachments = await facade.getAttachments('job-123');

    expect(Array.isArray(attachments)).toBe(true);
  });
});
