/**
 * Compile-time boundary for the future WhatsApp adapter.
 * It deliberately contains no session, transport, or business logic.
 */
export {
  cancelWorkflow,
  createConversation,
  editWorkflow,
  getWorkflowValidation,
  nextWorkflow,
  previousWorkflow,
  resumeWorkflow,
  submitWorkflow,
} from "@mspl/conversation-workflow";
