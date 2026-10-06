import type { Prisma } from "@prisma/client";
import { prismaClient } from "../database";
import type { DashboardCriticalTicketDto, DashboardSummaryDto, DashboardSummaryQueryDto } from "../dto/dashboard.dto";
import { ValidationError } from "../errors";
import { SPARKLINE_DAYS, buildKpi, countByDay, dayKey, endOfDay, lastNDays, startOfDay, sumByDay } from "../utils/dashboard-metrics";

const CLOSED = "Closed";
const IN_PROGRESS_ACTIVITY_TYPES = ["WORKFLOW_WORKSHOP_REQUIRED", "WORKFLOW_REPAIR_RESUMED", "WORKFLOW_RETURNED_FOR_REWORK"];
const WAITING_FOR_PARTS_ACTIVITY_TYPES = ["WORKFLOW_WAITING_FOR_PARTS"];

function validateQuery(input: unknown): DashboardSummaryQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const from = typeof query.from === "string" && query.from.trim() ? query.from.trim() : undefined;
  const to = typeof query.to === "string" && query.to.trim() ? query.to.trim() : undefined;
  if (from && Number.isNaN(new Date(from).getTime())) {
    throw new ValidationError("from must be a valid date.");
  }
  if (to && Number.isNaN(new Date(to).getTime())) {
    throw new ValidationError("to must be a valid date.");
  }
  return { from, to };
}

export class DashboardService {
  async getSummary(queryInput: unknown): Promise<DashboardSummaryDto> {
    const query = validateQuery(queryInput);
    const now = new Date();
    const rangeStart = lastNDays(SPARKLINE_DAYS)[0];

    const where: Prisma.TicketWhereInput = {
      deletedAt: null,
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const tickets = await prismaClient.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        rfdAt: true,
        eta: true,
        serviceLossAmount: true,
        status: { select: { name: true } },
        workflowStage: true,
        issueCategory: { select: { name: true } },
        deployment: { select: { vehicleNumber: true, hub: { select: { name: true } } } },
        jobCard: { select: { workflowStage: true, lastEditedAt: true } },
      },
    });

    let closedCount = 0;
    let inProgressCount = 0;
    let waitingForPartsCount = 0;
    let withinSla = 0;
    let breached = 0;
    let noSla = 0;
    const hubOpenCounts = new Map<string, number>();

    for (const ticket of tickets) {
      const isClosed = ticket.status.name === CLOSED || ticket.status.name === "Cancelled";
      if (ticket.status.name === CLOSED) closedCount += 1;
      if (ticket.workflowStage === "WORKSHOP_REQUIRED" && ticket.jobCard) {
        if (ticket.jobCard.workflowStage === "WAITING_PARTS") waitingForPartsCount += 1;
        else if (ticket.jobCard.workflowStage === "IN_PROGRESS" && ticket.jobCard.lastEditedAt !== null) inProgressCount += 1;
      }

      if (!ticket.eta) {
        noSla += 1;
      } else {
        const comparedAt = ticket.closedAt ?? now;
        if (comparedAt <= ticket.eta) withinSla += 1;
        else breached += 1;
      }

      if (!isClosed) {
        const hubName = ticket.deployment?.hub?.name ?? "Unassigned";
        hubOpenCounts.set(hubName, (hubOpenCounts.get(hubName) ?? 0) + 1);
      }
    }

    const openCount = tickets.length - closedCount - tickets.filter((ticket) => ticket.status.name === "Cancelled").length;

    const activities = await prismaClient.ticketActivity.findMany({
      where: { ticketId: { in: tickets.map((ticket) => ticket.id) }, performedAt: { gte: rangeStart } },
      select: { activityType: true, performedAt: true },
    });
    const inProgressEvents = activities.filter((activity) => IN_PROGRESS_ACTIVITY_TYPES.includes(activity.activityType));
    const waitingForPartsEvents = activities.filter((activity) => WAITING_FOR_PARTS_ACTIVITY_TYPES.includes(activity.activityType));

    const createdInRange = tickets.filter((ticket) => ticket.createdAt >= rangeStart);
    const closedInRange = tickets.filter((ticket) => ticket.closedAt && ticket.closedAt >= rangeStart);
    const rfdInRange = tickets.filter((ticket) => ticket.rfdAt && ticket.rfdAt >= rangeStart && ticket.serviceLossAmount !== null);

    const openKpi = buildKpi(openCount, countByDay(createdInRange, (ticket) => ticket.createdAt));
    const closedKpi = buildKpi(closedCount, countByDay(closedInRange, (ticket) => ticket.closedAt as Date));
    const inProgressKpi = buildKpi(inProgressCount, countByDay(inProgressEvents, (activity) => activity.performedAt));
    const waitingForPartsKpi = buildKpi(waitingForPartsCount, countByDay(waitingForPartsEvents, (activity) => activity.performedAt));

    const serviceLossValueToday = rfdInRange
      .filter((ticket) => dayKey(ticket.rfdAt as Date) === dayKey(now))
      .reduce((sum, ticket) => sum + Number(ticket.serviceLossAmount ?? 0), 0);
    const serviceLossKpi = buildKpi(
      Number(serviceLossValueToday.toFixed(2)),
      sumByDay(rfdInRange, (ticket) => ticket.rfdAt as Date, (ticket) => Number(ticket.serviceLossAmount ?? 0))
    );

    const startToday = startOfDay(now);
    const endToday = endOfDay(now);
    const todaysActivities = {
      created: tickets.filter((ticket) => ticket.createdAt >= startToday && ticket.createdAt <= endToday).length,
      updated: tickets.filter(
        (ticket) => ticket.updatedAt >= startToday && ticket.updatedAt <= endToday && !(ticket.createdAt >= startToday && ticket.createdAt <= endToday)
      ).length,
      resolved: tickets.filter((ticket) => ticket.closedAt && ticket.closedAt >= startToday && ticket.closedAt <= endToday).length,
      rfdMarked: tickets.filter((ticket) => ticket.rfdAt && ticket.rfdAt >= startToday && ticket.rfdAt <= endToday).length,
    };

    const topHubs = Array.from(hubOpenCounts.entries())
      .map(([hub, openTickets]) => ({ hub, openTickets }))
      .sort((a, b) => b.openTickets - a.openTickets)
      .slice(0, 5);

    const recentCriticalTickets: DashboardCriticalTicketDto[] = tickets
      .filter((ticket) => (ticket.priority === "CRITICAL" || ticket.priority === "HIGH") && ticket.status.name !== CLOSED && ticket.status.name !== "Cancelled")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        category: ticket.issueCategory.name,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        hub: ticket.deployment?.hub?.name ?? null,
        vehicleNumber: ticket.deployment?.vehicleNumber ?? null,
        eta: ticket.eta ? ticket.eta.toISOString() : null,
      }));

    const totalSlaTickets = withinSla + breached;

    return {
      openTickets: openKpi,
      closedTickets: closedKpi,
      inProgress: inProgressKpi,
      waitingForParts: waitingForPartsKpi,
      serviceLossToday: serviceLossKpi,
      slaCompliance: {
        withinSla,
        breached,
        noSla,
        withinSlaPct: totalSlaTickets === 0 ? 100 : Number(((withinSla / totalSlaTickets) * 100).toFixed(1)),
      },
      ticketsTrend: lastNDays(SPARKLINE_DAYS).map((day) => ({
        date: dayKey(day),
        count: countByDay(createdInRange, (ticket) => ticket.createdAt).get(dayKey(day)) ?? 0,
      })),
      topHubs,
      recentCriticalTickets,
      todaysActivities,
      generatedAt: now.toISOString(),
    };
  }
}

export const dashboardService = new DashboardService();
