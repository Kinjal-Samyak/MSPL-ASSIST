/**
 * Presentation models for workflow execution. Deliberately thin: an action is just an id + label
 * the backend decided to offer for this job right now. The mobile app never computes which
 * actions are valid, what they mean, or what happens after - it only renders whatever the
 * repository returns and reports back which one was tapped. All of that decision-making
 * (state machine, permissions, validation) stays in the backend.
 */
export interface WorkflowAction {
  id: string;
  label: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  message: string;
}
