import { conversationSteps } from '@mspl/shared-constants';
import type { ConversationStep } from '@mspl/shared-types';
import { firstValidationError, type ValidationResult } from '@mspl/shared-validation';

export { conversationSteps };

export type { ConversationStep } from '@mspl/shared-types';

export type WorkflowProjection = {
  currentStep: number;
  hasRider: boolean;
  hasVehicle: boolean;
  hasRideability: boolean;
  hasCategory: boolean;
  hasSubcategory: boolean;
  issueGroupCount: number;
  remarksWordCount: number;
};

export type WorkflowTransition = { step: number; validation: ValidationResult };

export function createConversation(): WorkflowProjection {
  return { currentStep: 0, hasRider: false, hasVehicle: false, hasRideability: false, hasCategory: false, hasSubcategory: false, issueGroupCount: 0, remarksWordCount: 0 };
}

export function getWorkflowValidation(state: WorkflowProjection, step = state.currentStep): ValidationResult {
  if (step === 0 && !state.hasRider) return 'Select a rider to continue.';
  if (step === 1 && !state.hasVehicle) return 'Confirm the rider\'s active vehicle to continue.';
  if (step === 2 && !state.hasRideability) return 'Choose whether the vehicle can be ridden.';
  if (step === 3 && !state.hasCategory) return 'Choose a problem to continue.';
  if (step === 4 && !state.hasSubcategory) return 'Choose an option that describes the problem.';
  if (step === 5 && state.issueGroupCount === 0) return 'Add at least one problem to the ticket.';
  if (step === 6 && state.remarksWordCount > 200) return 'Remarks cannot exceed 200 words.';
  if (step === 8) return validateWorkflowCompletion(state);
  return null;
}

export function nextWorkflow(state: WorkflowProjection): WorkflowTransition {
  const validation = getWorkflowValidation(state);
  return validation ? { step: state.currentStep, validation } : { step: Math.min(9, state.currentStep + 1), validation: null };
}

export function previousWorkflow(state: WorkflowProjection): WorkflowTransition { return { step: Math.max(0, state.currentStep - 1), validation: null }; }

export function editWorkflow(state: WorkflowProjection, step: number): WorkflowTransition {
  if (!Number.isInteger(step) || step < 0 || step > 8) return { step: state.currentStep, validation: 'That conversation step is unavailable.' };
  return { step, validation: null };
}

export function cancelWorkflow(): WorkflowTransition { return { step: 0, validation: null }; }
export function resumeWorkflow(state: WorkflowProjection): WorkflowTransition { return { step: state.currentStep, validation: getWorkflowValidation(state) }; }

export function submitWorkflow(state: WorkflowProjection): WorkflowTransition {
  const validation = validateWorkflowCompletion(state);
  return validation ? { step: state.currentStep, validation } : { step: 9, validation: null };
}

export function validateWorkflowCompletion(state: WorkflowProjection): ValidationResult {
  return firstValidationError(
    !state.hasRider || !state.hasVehicle || !state.hasRideability
      ? 'Complete rider, vehicle, and rideability details before creating the ticket.'
      : null,
    state.issueGroupCount === 0 ? 'Add at least one problem before creating the ticket.' : null,
    state.remarksWordCount > 200 ? 'Remarks cannot exceed 200 words.' : null,
  );
}
