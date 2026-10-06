import { computeDailyRental, computeDowntimeDays, computeServiceLoss } from "../../utils/service-loss";

describe("service-loss", () => {
  describe("computeDailyRental", () => {
    it("should_divide_weekly_rental_by_seven", () => {
      expect(computeDailyRental(1400)).toBe(200);
    });

    it("should_round_to_two_decimal_places", () => {
      expect(computeDailyRental(1000)).toBe(142.86);
    });
  });

  describe("computeDowntimeDays", () => {
    it("should_compute_whole_days_between_two_dates", () => {
      const createdAt = new Date("2026-07-01T00:00:00.000Z");
      const rfdAt = new Date("2026-07-04T00:00:00.000Z");
      expect(computeDowntimeDays(createdAt, rfdAt)).toBe(3);
    });

    it("should_compute_fractional_days", () => {
      const createdAt = new Date("2026-07-01T00:00:00.000Z");
      const rfdAt = new Date("2026-07-01T12:00:00.000Z");
      expect(computeDowntimeDays(createdAt, rfdAt)).toBe(0.5);
    });

    it("should_never_return_a_negative_value", () => {
      const createdAt = new Date("2026-07-04T00:00:00.000Z");
      const rfdAt = new Date("2026-07-01T00:00:00.000Z");
      expect(computeDowntimeDays(createdAt, rfdAt)).toBe(0);
    });
  });

  describe("computeServiceLoss", () => {
    it("should_multiply_downtime_days_by_daily_rental", () => {
      expect(computeServiceLoss(3, 200)).toBe(600);
    });

    it("should_round_to_two_decimal_places", () => {
      expect(computeServiceLoss(2.5, 142.86)).toBe(357.15);
    });
  });
});
