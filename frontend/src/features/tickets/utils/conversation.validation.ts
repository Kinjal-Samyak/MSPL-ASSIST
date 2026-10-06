import type { TicketConversationState } from '@/features/tickets/types/conversation.types';
import {
  getWorkflowValidation,
  validateWorkflowCompletion,
  type WorkflowProjection,
} from '@mspl/conversation-workflow';

export function countConversationWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function validateConversationStep(
  step: number,
  state: TicketConversationState
): string | null {
  return getWorkflowValidation(toWorkflowProjection(state), step);
}

export function validateConversationSubmission(state: TicketConversationState): string | null {
  return validateWorkflowCompletion(toWorkflowProjection(state));
}

export function toWorkflowProjection(state: TicketConversationState): WorkflowProjection {
  return {
    currentStep: state.currentStep,
    hasRider: Boolean(state.selectedRider),
    hasVehicle: Boolean(state.selectedVehicle),
    hasRideability: Boolean(state.rideability),
    hasCategory: Boolean(state.selectedCategory),
    hasSubcategory: Boolean(state.selectedSubcategory),
    issueGroupCount: state.issueGroups.length,
    remarksWordCount: countConversationWords(state.remarks),
  };
}

export const supportedConversationPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const maxConversationPhotoBytes = 5 * 1024 * 1024;
