import type { RiderConversationState, RiderConversationStep } from "./types";

const ORDER: RiderConversationStep[] = [
  "VEHICLE_VERIFICATION", "VEHICLE_CONDITION", "ISSUE_CATEGORY", "ISSUE_SUBCATEGORY",
  "REMARKS", "PHOTO_UPLOAD", "REVIEW", "TICKET_CREATION", "COMPLETED",
];

/**
 * Pure state machine only. It has no database, TicketService, HTTP, WhatsApp, or notification dependency.
 * Keeping it pure makes it safe to test and ready for an explicit future integration decision.
 */
export class RiderTicketConversationEngine {
  start(): RiderConversationState {
    return { step: "VEHICLE_VERIFICATION", draft: { issueCategoryIds: [], issueSubcategoryIds: [], photoReferences: [] } };
  }

  next(state: RiderConversationState): RiderConversationState {
    this.assertStepComplete(state);
    const index = ORDER.indexOf(state.step);
    return { ...state, step: ORDER[Math.min(index + 1, ORDER.length - 1)] };
  }

  previous(state: RiderConversationState): RiderConversationState {
    const index = ORDER.indexOf(state.step);
    return { ...state, step: ORDER[Math.max(index - 1, 0)] };
  }

  cancel(state: RiderConversationState): RiderConversationState {
    return { ...state, step: "CANCELLED" };
  }

  private assertStepComplete(state: RiderConversationState): void {
    const { draft } = state;
    if (state.step === "VEHICLE_VERIFICATION" && !draft.vehicleId) throw new Error("Vehicle selection is required.");
    if (state.step === "VEHICLE_CONDITION" && !draft.vehicleCondition) throw new Error("Vehicle condition is required.");
    if (state.step === "ISSUE_CATEGORY" && draft.issueCategoryIds.length === 0) throw new Error("At least one issue category is required.");
    if (state.step === "ISSUE_SUBCATEGORY" && draft.issueSubcategoryIds.length === 0) throw new Error("At least one issue subcategory is required.");
  }
}
