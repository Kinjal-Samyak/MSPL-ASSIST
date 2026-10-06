import type { DashboardKpiDto } from "../dto/dashboard.dto";

export const SPARKLINE_DAYS = 7;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/** Local calendar-day key (not a UTC round-trip - a UTC toISOString() slice would shift the
 * date whenever the server's local timezone isn't UTC, e.g. IST). */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Last N calendar days ending today, oldest first. */
export function lastNDays(count: number, today: Date = new Date()): Date[] {
  const days: Date[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    days.push(startOfDay(date));
  }
  return days;
}

export function countByDay<T>(records: T[], getDate: (record: T) => Date): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = dayKey(getDate(record));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function sumByDay<T>(records: T[], getDate: (record: T) => Date, getAmount: (record: T) => number): Map<string, number> {
  const sums = new Map<string, number>();
  for (const record of records) {
    const key = dayKey(getDate(record));
    sums.set(key, (sums.get(key) ?? 0) + getAmount(record));
  }
  return sums;
}

/**
 * Builds a KPI card's sparkline + vs-yesterday delta from a day -> count/sum map.
 * Delta is null (not 0%) when yesterday had zero, since a percentage change from zero is undefined.
 */
export function buildKpi(value: number, dailyCountsByDay: Map<string, number>, today: Date = new Date()): DashboardKpiDto {
  const days = lastNDays(SPARKLINE_DAYS, today);
  const sparkline = days.map((day) => dailyCountsByDay.get(dayKey(day)) ?? 0);
  const todayCount = sparkline[sparkline.length - 1] ?? 0;
  const yesterdayCount = sparkline[sparkline.length - 2] ?? 0;
  const deltaVsYesterdayPct =
    yesterdayCount === 0 ? (todayCount === 0 ? 0 : null) : Number((((todayCount - yesterdayCount) / yesterdayCount) * 100).toFixed(1));
  return { value, deltaVsYesterdayPct, sparkline };
}
