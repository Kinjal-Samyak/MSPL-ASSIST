import {
  computeCommunicationHealth,
  computeSuggestedCommunicationEvent,
  getAvailableCommunicationEvents,
  type TicketCommunicationContext,
} from "../../utils/communication-center";
import type { CommunicationCenterEventType } from "../../dto/notification.dto";

function enabledEvents(context: TicketCommunicationContext): CommunicationCenterEventType[] {
  return getAvailableCommunicationEvents(context)
    .filter((entry) => entry.enabled)
    .map((entry) => entry.eventType);
}

describe("getAvailableCommunicationEvents", () => {
  it("should_only_enable_created_and_general_announcement_before_service_tl_assignment", () => {
    const events = enabledEvents({ workflowStage: "CREATED", jobCardStage: null, statusName: "Open" });
    expect(events).toEqual(["TICKET_CREATED", "GENERAL_ANNOUNCEMENT"]);
  });

  it("should_enable_ticket_assigned_once_service_tl_review_begins", () => {
    const events = enabledEvents({ workflowStage: "SERVICE_TL_REVIEW", jobCardStage: null, statusName: "Assigned" });
    expect(events).toContain("TICKET_ASSIGNED");
    expect(events).not.toContain("REPAIR_STARTED");
  });

  it("should_disable_repair_waiting_completed_rfd_and_charges_before_a_job_card_exists", () => {
    const events = enabledEvents({ workflowStage: "SERVICE_TL_REVIEW", jobCardStage: null, statusName: "Assigned" });
    expect(events).not.toContain("REPAIR_STARTED");
    expect(events).not.toContain("WAITING_FOR_PARTS");
    expect(events).not.toContain("WORK_COMPLETED");
    expect(events).not.toContain("READY_FOR_DELIVERY");
    expect(events).not.toContain("TICKET_CHARGES_UPDATED");
  });

  it("should_enable_repair_started_once_the_job_card_is_created", () => {
    const events = enabledEvents({ workflowStage: "WORKSHOP_REQUIRED", jobCardStage: "IN_PROGRESS", statusName: "Repair In Progress" });
    expect(events).toContain("REPAIR_STARTED");
    expect(events).toContain("WAITING_FOR_PARTS");
    expect(events).not.toContain("WORK_COMPLETED");
  });

  it("should_enable_work_completed_once_the_technician_marks_the_job_card_complete", () => {
    const events = enabledEvents({ workflowStage: "WORKSHOP_REQUIRED", jobCardStage: "COMPLETED", statusName: "Repair In Progress" });
    expect(events).toContain("WORK_COMPLETED");
    expect(events).not.toContain("READY_FOR_DELIVERY");
  });

  it("should_enable_ready_for_delivery_and_charges_once_the_service_tl_marks_rfd", () => {
    const events = enabledEvents({ workflowStage: "RFD", jobCardStage: "RFD", statusName: "Ready for Delivery" });
    expect(events).toContain("READY_FOR_DELIVERY");
    expect(events).toContain("TICKET_CHARGES_UPDATED");
    expect(events).toContain("VEHICLE_PENDING_PICKUP_REMINDER");
  });

  it("should_disable_everything_except_ticket_closed_and_general_announcement_once_closed", () => {
    const events = enabledEvents({ workflowStage: "RFD", jobCardStage: "RFD", statusName: "Closed" });
    expect(events).toEqual(["TICKET_CLOSED", "GENERAL_ANNOUNCEMENT"]);
  });

  it("should_disable_everything_except_ticket_cancelled_and_general_announcement_once_cancelled", () => {
    const events = enabledEvents({ workflowStage: "CREATED", jobCardStage: null, statusName: "Cancelled" });
    expect(events).toEqual(["TICKET_CANCELLED", "GENERAL_ANNOUNCEMENT"]);
  });
});

describe("computeSuggestedCommunicationEvent", () => {
  it("should_suggest_the_most_advanced_enabled_event_that_has_not_been_sent", () => {
    const availability = getAvailableCommunicationEvents({
      workflowStage: "WORKSHOP_REQUIRED",
      jobCardStage: "WAITING_PARTS",
      statusName: "Repair In Progress",
    });
    const sent = new Set<CommunicationCenterEventType>(["TICKET_CREATED", "TICKET_ASSIGNED"]);
    expect(computeSuggestedCommunicationEvent(availability, sent)).toBe("WAITING_FOR_PARTS");
  });

  it("should_return_null_when_every_enabled_event_has_already_been_sent", () => {
    const availability = getAvailableCommunicationEvents({ workflowStage: "CREATED", jobCardStage: null, statusName: "Open" });
    const sent = new Set<CommunicationCenterEventType>(["TICKET_CREATED", "GENERAL_ANNOUNCEMENT"]);
    expect(computeSuggestedCommunicationEvent(availability, sent)).toBeNull();
  });
});

describe("computeCommunicationHealth", () => {
  const now = new Date("2026-07-24T12:00:00.000Z");

  it("should_be_up_to_date_when_there_is_no_suggested_event", () => {
    expect(computeCommunicationHealth({ suggestedEvent: null, stageEnteredAt: now, now })).toBe("UP_TO_DATE");
  });

  it("should_recommend_an_update_when_the_stage_was_entered_recently", () => {
    const stageEnteredAt = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
    expect(computeCommunicationHealth({ suggestedEvent: "WAITING_FOR_PARTS", stageEnteredAt, now })).toBe(
      "UPDATE_RECOMMENDED"
    );
  });

  it("should_flag_not_updated_once_the_urgent_threshold_is_exceeded", () => {
    const stageEnteredAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    expect(computeCommunicationHealth({ suggestedEvent: "READY_FOR_DELIVERY", stageEnteredAt, now })).toBe(
      "NOT_UPDATED"
    );
  });
});
