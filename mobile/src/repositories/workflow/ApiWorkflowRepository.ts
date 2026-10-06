import type { WorkflowAction, WorkflowExecutionResult } from '@/models';
import type { WorkflowRepository } from './WorkflowRepository';

/**
 * The future production implementation. Deliberately inert - no Axios, no endpoints, no backend
 * calls. Implement against `apiClient` (see `@/api`) once the backend exposes technician-facing
 * job-card transition endpoints; the backend's response is what decides available actions and
 * whether an execution succeeds, not this file.
 */
export class ApiWorkflowRepository implements WorkflowRepository {
  async getAvailableActions(_jobId: string): Promise<WorkflowAction[]> {
    throw new Error('ApiWorkflowRepository is not implemented yet.');
  }

  async executeAction(_jobId: string, _actionId: string): Promise<WorkflowExecutionResult> {
    throw new Error('ApiWorkflowRepository is not implemented yet.');
  }
}
