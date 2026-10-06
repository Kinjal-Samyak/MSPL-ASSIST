import { env } from '@/config';
import { ApiWorkflowRepository } from './ApiWorkflowRepository';
import { MockWorkflowRepository } from './MockWorkflowRepository';
import type { WorkflowRepository } from './WorkflowRepository';

export type { WorkflowRepository } from './WorkflowRepository';
export { MockWorkflowRepository } from './MockWorkflowRepository';
export { ApiWorkflowRepository } from './ApiWorkflowRepository';

/** The one place that decides which `WorkflowRepository` implementation is active - same pattern as every other repository factory in the app. */
function createWorkflowRepository(): WorkflowRepository {
  if (env.appEnv === 'production') {
    return new ApiWorkflowRepository();
  }
  return new MockWorkflowRepository();
}

export const workflowRepository: WorkflowRepository = createWorkflowRepository();
