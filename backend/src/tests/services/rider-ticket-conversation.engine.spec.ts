import { RiderTicketConversationEngine } from "../../conversation-engine/rider-ticket-conversation.engine";

describe("RiderTicketConversationEngine (shadow mode)", () => {
  it("does not advance until each mandatory step is complete", () => {
    const engine = new RiderTicketConversationEngine();
    const initial = engine.start();
    expect(() => engine.next(initial)).toThrow("Vehicle selection is required.");
    const vehicle = engine.next({ ...initial, draft: { ...initial.draft, vehicleId: "vehicle-1" } });
    expect(vehicle.step).toBe("VEHICLE_CONDITION");
    expect(() => engine.next(vehicle)).toThrow("Vehicle condition is required.");
  });

  it("supports back and cancel without any external side effect", () => {
    const engine = new RiderTicketConversationEngine();
    const start = engine.start();
    expect(engine.previous(start).step).toBe("VEHICLE_VERIFICATION");
    expect(engine.cancel(start).step).toBe("CANCELLED");
  });
});
