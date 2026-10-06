import { validateUpdateTicketPriorityDto } from "../../validators/ticket-priority.validator";

describe("Ticket priority validator", () => {
  it("normalizes a valid priority-change payload", () => {
    expect(validateUpdateTicketPriorityDto({ priority: "critical", reason: "Vehicle stopped, escalating." })).toEqual({
      priority: "CRITICAL",
      reason: "Vehicle stopped, escalating.",
    });
  });

  it("rejects an unknown priority value", () => {
    expect(() => validateUpdateTicketPriorityDto({ priority: "URGENT", reason: "x" })).toThrow("priority must be one of LOW, MEDIUM, HIGH, CRITICAL.");
  });

  it("rejects a priority change without a reason", () => {
    expect(() => validateUpdateTicketPriorityDto({ priority: "LOW" })).toThrow("A reason is required to change ticket priority.");
  });
});
