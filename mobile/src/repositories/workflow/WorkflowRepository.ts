import type { WorkflowAction, WorkflowExecutionResult } from '@/models';

/**
 * The single abstraction for workflow operations - same shape as every other repository in the
 * app. Deliberately owns no decision-making: `getAvailableActions` returns whatever the backend
 * currently offers (never computed client-side), and `executeAction` just relays a chosen action
 * id and reports what came back. State machines, permissions, and validation stay in the backend.
 */
export interface WorkflowRepository {
  getAvailableActions(jobId: string): Promise<WorkflowAction[]>;
  executeAction(jobId: string, actionId: string): Promise<WorkflowExecutionResult>;
}
