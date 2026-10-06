import type { WorkflowAction, WorkflowExecutionResult } from '@/models';
import type { WorkflowRepository } from './WorkflowRepository';

/**
 * TEMPORARY. The only concrete `WorkflowRepository` used while there is no backend to talk to.
 *
 * Deliberately returns one neutral, obviously-placeholder action ("Acknowledge Job") rather than
 * real MSPL Assist job-card transitions (Start Repair, Mark Complete, ...). Committing to those
 * exact names/semantics here would mean this mobile layer deciding which actions are valid for
 * which job state - precisely the responsibility this repository is designed to keep out of the
 * client. The same fixed action is returned regardless of job state (no state machine here
 * either). Delete alongside the mock-only branch of `index.ts` once `ApiWorkflowRepository` is real.
 */
const SIMULATED_LATENCY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockWorkflowRepository implements WorkflowRepository {
  async getAvailableActions(_jobId: string): Promise<WorkflowAction[]> {
    await wait(SIMULATED_LATENCY_MS);
    return [{ id: 'acknowledge', label: 'Acknowledge Job' }];
  }

  async executeAction(_jobId: string, _actionId: string): Promise<WorkflowExecutionResult> {
    await wait(SIMULATED_LATENCY_MS);
    return { success: true, message: 'Action completed.' };
  }
}
