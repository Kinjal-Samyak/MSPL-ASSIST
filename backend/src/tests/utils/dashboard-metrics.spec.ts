import { buildKpi, countByDay, dayKey, lastNDays, sumByDay } from "../../utils/dashboard-metrics";

// Constructed via the local Date constructor (not UTC ISO strings) so this suite is
// deterministic regardless of the machine/CI runner's timezone.
const FIXED_TODAY = new Date(2026, 6, 23, 12, 0, 0);
const TODAY_MORNING = new Date(2026, 6, 23, 5, 0, 0);
const YESTERDAY_MORNING = new Date(2026, 6, 22, 1, 0, 0);
const YESTERDAY_EVENING = new Date(2026, 6, 22, 23, 0, 0);

describe("dashboard-metrics", () => {
  describe("dayKey", () => {
    it("should_format_a_date_as_a_local_yyyy_mm_dd_key", () => {
      expect(dayKey(new Date(2026, 6, 23, 18, 45, 0))).toBe("2026-07-23");
    });
  });

  describe("lastNDays", () => {
    it("should_return_n_days_ending_today_oldest_first", () => {
      const days = lastNDays(3, FIXED_TODAY);
      expect(days).toHaveLength(3);
      expect(dayKey(days[days.length - 1])).toBe(dayKey(FIXED_TODAY));
      expect(dayKey(days[0]) < dayKey(days[1])).toBe(true);
    });
  });

  describe("countByDay", () => {
    it("should_group_records_by_day_key", () => {
      const records = [YESTERDAY_MORNING, YESTERDAY_EVENING, TODAY_MORNING];
      const counts = countByDay(records, (record) => record);
      expect(counts.get("2026-07-22")).toBe(2);
      expect(counts.get("2026-07-23")).toBe(1);
    });
  });

  describe("sumByDay", () => {
    it("should_sum_amounts_grouped_by_day_key", () => {
      const records = [
        { date: YESTERDAY_MORNING, amount: 100 },
        { date: YESTERDAY_EVENING, amount: 50 },
        { date: TODAY_MORNING, amount: 25 },
      ];
      const sums = sumByDay(records, (record) => record.date, (record) => record.amount);
      expect(sums.get("2026-07-22")).toBe(150);
      expect(sums.get("2026-07-23")).toBe(25);
    });
  });

  describe("buildKpi", () => {
    it("should_compute_a_positive_delta_vs_yesterday", () => {
      const counts = new Map([
        [dayKey(YESTERDAY_MORNING), 4],
        [dayKey(FIXED_TODAY), 8],
      ]);
      const kpi = buildKpi(8, counts, FIXED_TODAY);
      expect(kpi.value).toBe(8);
      expect(kpi.deltaVsYesterdayPct).toBe(100);
      expect(kpi.sparkline).toHaveLength(7);
      expect(kpi.sparkline[kpi.sparkline.length - 1]).toBe(8);
    });

    it("should_return_null_delta_when_yesterday_was_zero_but_today_is_not", () => {
      const counts = new Map([[dayKey(FIXED_TODAY), 5]]);
      const kpi = buildKpi(5, counts, FIXED_TODAY);
      expect(kpi.deltaVsYesterdayPct).toBeNull();
    });

    it("should_return_zero_delta_when_both_today_and_yesterday_are_zero", () => {
      const kpi = buildKpi(0, new Map(), FIXED_TODAY);
      expect(kpi.deltaVsYesterdayPct).toBe(0);
    });

    it("should_compute_a_negative_delta_vs_yesterday", () => {
      const counts = new Map([
        [dayKey(YESTERDAY_MORNING), 10],
        [dayKey(FIXED_TODAY), 5],
      ]);
      const kpi = buildKpi(5, counts, FIXED_TODAY);
      expect(kpi.deltaVsYesterdayPct).toBe(-50);
    });
  });
});
