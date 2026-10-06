/**
 * Pure Service Loss calculation formulas, shared between the RFD-freeze write path
 * (ticket-workflow.repository.ts) and the live read path (service-loss-analytics module)
 * so both always agree on the same math.
 */

export function computeDowntimeDays(createdAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - createdAt.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(days * 100) / 100);
}

export function computeServiceLoss(downtimeDays: number, dailyRental: number): number {
  return Math.round(downtimeDays * dailyRental * 100) / 100;
}

export function computeDailyRental(weeklyRental: number): number {
  return Math.round((weeklyRental / 7) * 100) / 100;
}
