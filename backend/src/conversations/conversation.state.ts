export enum ConversationState {
  MAIN_MENU = "MAIN_MENU",
  REGISTER_SERVICE = "REGISTER_SERVICE",
  TRACK_TICKET = "TRACK_TICKET",
  WAITING_ISSUE_CATEGORY = "WAITING_ISSUE_CATEGORY",
  WAITING_ADD_MORE_ISSUES = "WAITING_ADD_MORE_ISSUES",
  WAITING_ISSUE_DESCRIPTION = "WAITING_ISSUE_DESCRIPTION",
  WAITING_PHOTO = "WAITING_PHOTO",
  WAITING_PHOTO_UPLOAD = "WAITING_PHOTO_UPLOAD",
  WAITING_REGISTERED_MOBILE = "WAITING_REGISTERED_MOBILE",
  VERIFYING_CUSTOMER = "VERIFYING_CUSTOMER",
  VERIFYING_DEPLOYMENT = "VERIFYING_DEPLOYMENT",
  REVIEW_TICKET = "REVIEW_TICKET",
  WAITING_TICKET_CREATION = "WAITING_TICKET_CREATION",
  CONFIRMATION = "CONFIRMATION",
  COMPLETED = "COMPLETED",
}

export type ConversationStateType = `${ConversationState}`;

export function isValidConversationState(value: unknown): value is ConversationState {
  if (typeof value !== "string") {
    return false;
  }
  return Object.values(ConversationState).includes(value as ConversationState);
}

export function getConversationState(value: string): ConversationState | null {
  const normalized = value.trim().toUpperCase();
  return isValidConversationState(normalized) ? (normalized as ConversationState) : null;
}
