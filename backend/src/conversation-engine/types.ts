/**
 * Shadow contract for the frozen channel-independent rider journey.
 * This module is intentionally not registered with any current route or channel.
 */
export type RiderConversationStep =
  | "VEHICLE_VERIFICATION"
  | "VEHICLE_CONDITION"
  | "ISSUE_CATEGORY"
  | "ISSUE_SUBCATEGORY"
  | "REMARKS"
  | "PHOTO_UPLOAD"
  | "REVIEW"
  | "TICKET_CREATION"
  | "COMPLETED"
  | "CANCELLED";

export interface RiderConversationDraft {
  vehicleId?: string;
  vehicleCondition?: "MOVABLE" | "NOT_MOVABLE";
  issueCategoryIds: string[];
  issueSubcategoryIds: string[];
  remarks?: string;
  photoReferences: string[];
}

export interface RiderConversationState {
  step: RiderConversationStep;
  draft: RiderConversationDraft;
}
