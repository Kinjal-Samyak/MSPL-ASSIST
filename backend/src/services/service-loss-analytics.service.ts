import { prismaClient } from "../database";
import type {
  DowntimeByModelRowDto,
  MonthlyTrendPointDto,
  ServiceLossByGroupRowDto,
  ServiceLossDrilldownResponseDto,
  ServiceLossFiltersDto,
  ServiceLossInsightDto,
  ServiceLossSummaryResponseDto,
  ServiceLossTicketRowDto,
  SlaComplianceDto,
} from "../dto/service-loss-analytics.dto";
import { ValidationError } from "../errors";
import { ServiceLossAnalyticsRepository, type TicketAnalyticsRow } from "../repositories/service-loss-analytics.repository";
import { computeDowntimeDays, computeServiceLoss } from "../utils/service-loss";

/** SLA "near" band: within this multiple of the target is Amber; beyond is Red. */
const SLA_NEAR_MULTIPLIER = 1.2;
const CACHE_TTL_MS = 60_000;

function slaStatusFor(downtimeDays: number, slaTargetDays: number): "WITHIN" | "NEAR" | "BREACHED" {
  if (downtimeDays <= slaTargetDays) return "WITHIN";
  if (downtimeDays <= slaTargetDays * SLA_NEAR_MULTIPLIER) return "NEAR";
  return "BREACHED";
}

function validateFilters(input: unknown): ServiceLossFiltersDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const str = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const from = str(query.from);
  const to = str(query.to);
  if (from && Number.isNaN(new Date(from).getTime())) throw new ValidationError("from must be a valid date.");
  if (to && Number.isNaN(new Date(to).getTime())) throw new ValidationError("to must be a valid date.");
  const status = str(query.status);
  if (status && status !== "OPEN" && status !== "CLOSED") throw new ValidationError("status must be OPEN or CLOSED.");
  return {
    from,
    to,
    hubId: str(query.hubId),
    vehicleModelId: str(query.vehicleModelId),
    serviceTlId: str(query.serviceTlId),
    technicianId: str(query.technicianId),
    status: status as "OPEN" | "CLOSED" | undefined,
  };
}

export class ServiceLossAnalyticsService {
  private readonly repository: ServiceLossAnalyticsRepository;
  private readonly rowsCache = new Map<string, { expiresAt: number; rows: ServiceLossTicketRowDto[] }>();

  constructor(repository?: ServiceLossAnalyticsRepository) {
    this.repository = repository ?? new ServiceLossAnalyticsRepository(prismaClient);
  }

  async getSummary(filtersInput: unknown): Promise<ServiceLossSummaryResponseDto> {
    const filters = validateFilters(filtersInput);
    const rows = await this.getRows(filters);

    const byVehicleModel = this.groupBy(rows, (row) => row.vehicleModelId, (row) => row.vehicleModel);
    const byHub = this.groupBy(rows, (row) => row.hubId, (row) => row.hub);
    const downtimeByModel = this.downtimeByModel(rows);
    const slaCompliance = this.slaCompliance(rows);
    const monthlyTrend = this.monthlyTrend(rows);
    const insights = this.buildInsights(rows, byVehicleModel, byHub, slaCompliance);

    return {
      byVehicleModel,
      byHub,
      downtimeByModel,
      slaCompliance,
      monthlyTrend,
      insights,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generic drill-down: accepts the same filter set as getSummary (vehicleModelId/hubId/from/to/...),
   * so clicking a model, a hub, or a month bar on the frontend is just a matter of merging that value
   * into the current global filters and calling this one endpoint - no per-chart drill-down endpoints needed.
   */
  async getDrilldown(filtersInput: unknown): Promise<ServiceLossDrilldownResponseDto> {
    const filters = validateFilters(filtersInput);
    const rows = await this.getRows(filters);
    return { items: rows, totalRecords: rows.length };
  }

  async getRowsForExport(filtersInput: unknown): Promise<{ summary: ServiceLossSummaryResponseDto; rows: ServiceLossTicketRowDto[] }> {
    const summary = await this.getSummary(filtersInput);
    const { items } = await this.getDrilldown(filtersInput);
    return { summary, rows: items };
  }

  /** Computes per-ticket Service Loss rows for the given filters, cached briefly to avoid recomputing on every dashboard load. */
  private async getRows(filters: ServiceLossFiltersDto): Promise<ServiceLossTicketRowDto[]> {
    const cacheKey = JSON.stringify(filters);
    const cached = this.rowsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rows;
    }

    const tickets = await this.repository.findFilteredTickets(filters);
    const vehicleModelIds = [...new Set(tickets.map((ticket) => ticket.deployment?.vehicleModel.id).filter((id): id is string => Boolean(id)))];
    const rates = await this.repository.findRatesForModels(vehicleModelIds);
    const ratesByModel = new Map<string, typeof rates>();
    for (const rate of rates) {
      const list = ratesByModel.get(rate.vehicleModelId) ?? [];
      list.push(rate);
      ratesByModel.set(rate.vehicleModelId, list);
    }

    const now = new Date();
    const rows = tickets
      .filter((ticket): ticket is TicketAnalyticsRow & { deployment: NonNullable<TicketAnalyticsRow["deployment"]> } => Boolean(ticket.deployment))
      .map((ticket) => this.toRow(ticket, ratesByModel, now));

    this.rowsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, rows });
    return rows;
  }

  private toRow(
    ticket: TicketAnalyticsRow & { deployment: NonNullable<TicketAnalyticsRow["deployment"]> },
    ratesByModel: Map<string, Array<{ effectiveFrom: Date; effectiveTo: Date | null; dailyRental: unknown }>>,
    now: Date
  ): ServiceLossTicketRowDto {
    const isOpen = ticket.rfdAt === null;
    const slaTargetDays = ticket.deployment.vehicleModel.slaTargetDays;

    if (!isOpen && ticket.serviceLossAmount !== null && ticket.serviceLossDailyRental !== null) {
      const downtimeDays = computeDowntimeDays(ticket.createdAt, ticket.rfdAt as Date);
      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        riderName: ticket.customer.name,
        vehicleNumber: ticket.deployment.vehicleNumber,
        vehicleModelId: ticket.deployment.vehicleModel.id,
        vehicleModel: ticket.deployment.vehicleModel.displayName,
        hubId: ticket.deployment.hub.id,
        hub: ticket.deployment.hub.name,
        serviceTl: ticket.serviceTl?.name ?? null,
        technician: ticket.assignedTo?.name ?? null,
        createdAt: ticket.createdAt.toISOString(),
        rfdAt: ticket.rfdAt ? ticket.rfdAt.toISOString() : null,
        downtimeDays,
        dailyRental: Number(ticket.serviceLossDailyRental),
        serviceLoss: Number(ticket.serviceLossAmount),
        isOpen: false,
        slaTargetDays,
        slaStatus: slaStatusFor(downtimeDays, slaTargetDays),
      };
    }

    const endDate = ticket.rfdAt ?? now;
    const downtimeDays = computeDowntimeDays(ticket.createdAt, endDate);
    const applicableRate = (ratesByModel.get(ticket.deployment.vehicleModel.id) ?? [])
      .filter((rate) => rate.effectiveFrom <= ticket.createdAt && (rate.effectiveTo === null || rate.effectiveTo >= ticket.createdAt))
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    const dailyRental = applicableRate ? Number(applicableRate.dailyRental) : 0;

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      riderName: ticket.customer.name,
      vehicleNumber: ticket.deployment.vehicleNumber,
      vehicleModelId: ticket.deployment.vehicleModel.id,
      vehicleModel: ticket.deployment.vehicleModel.displayName,
      hubId: ticket.deployment.hub.id,
      hub: ticket.deployment.hub.name,
      serviceTl: ticket.serviceTl?.name ?? null,
      technician: ticket.assignedTo?.name ?? null,
      createdAt: ticket.createdAt.toISOString(),
      rfdAt: ticket.rfdAt ? ticket.rfdAt.toISOString() : null,
      downtimeDays,
      dailyRental,
      serviceLoss: computeServiceLoss(downtimeDays, dailyRental),
      isOpen,
      slaTargetDays,
      slaStatus: slaStatusFor(downtimeDays, slaTargetDays),
    };
  }

  private groupBy(
    rows: ServiceLossTicketRowDto[],
    keyOf: (row: ServiceLossTicketRowDto) => string,
    labelOf: (row: ServiceLossTicketRowDto) => string
  ): ServiceLossByGroupRowDto[] {
    const totalLoss = rows.reduce((sum, row) => sum + row.serviceLoss, 0);
    const groups = new Map<string, { label: string; openTickets: number; totalTickets: number; downtimeSum: number; lossSum: number }>();

    for (const row of rows) {
      const key = keyOf(row);
      const group = groups.get(key) ?? { label: labelOf(row), openTickets: 0, totalTickets: 0, downtimeSum: 0, lossSum: 0 };
      group.totalTickets += 1;
      if (row.isOpen) group.openTickets += 1;
      group.downtimeSum += row.downtimeDays;
      group.lossSum += row.serviceLoss;
      groups.set(key, group);
    }

    return [...groups.entries()]
      .map(([groupId, group]) => ({
        groupId,
        groupLabel: group.label,
        openTickets: group.openTickets,
        totalTickets: group.totalTickets,
        averageDowntime: round2(group.downtimeSum / group.totalTickets),
        totalServiceLoss: round2(group.lossSum),
        percentageContribution: totalLoss > 0 ? round2((group.lossSum / totalLoss) * 100) : 0,
      }))
      .sort((a, b) => b.totalServiceLoss - a.totalServiceLoss);
  }

  private downtimeByModel(rows: ServiceLossTicketRowDto[]): DowntimeByModelRowDto[] {
    const groups = new Map<string, { label: string; slaTargetDays: number; downtimeSum: number; count: number }>();
    for (const row of rows) {
      const group = groups.get(row.vehicleModelId) ?? { label: row.vehicleModel, slaTargetDays: row.slaTargetDays, downtimeSum: 0, count: 0 };
      group.downtimeSum += row.downtimeDays;
      group.count += 1;
      groups.set(row.vehicleModelId, group);
    }
    return [...groups.entries()]
      .map(([vehicleModelId, group]) => {
        const averageDowntime = round2(group.downtimeSum / group.count);
        return {
          vehicleModelId,
          vehicleModel: group.label,
          averageDowntime,
          slaTargetDays: group.slaTargetDays,
          slaStatus: slaStatusFor(averageDowntime, group.slaTargetDays),
        };
      })
      .sort((a, b) => b.averageDowntime - a.averageDowntime);
  }

  private slaCompliance(rows: ServiceLossTicketRowDto[]): SlaComplianceDto {
    const totalTickets = rows.length;
    const withinSla = rows.filter((row) => row.slaStatus === "WITHIN").length;
    const outsideSla = totalTickets - withinSla;
    const revenueLossDueToSlaBreach = round2(
      rows.filter((row) => row.slaStatus !== "WITHIN").reduce((sum, row) => sum + row.serviceLoss, 0)
    );
    return {
      totalTickets,
      withinSla,
      outsideSla,
      slaCompliancePercent: totalTickets > 0 ? round2((withinSla / totalTickets) * 100) : 0,
      revenueLossDueToSlaBreach,
    };
  }

  private monthlyTrend(rows: ServiceLossTicketRowDto[]): MonthlyTrendPointDto[] {
    const groups = new Map<string, { totalTickets: number; downtimeSum: number; lossSum: number }>();
    for (const row of rows) {
      const month = row.createdAt.slice(0, 7);
      const group = groups.get(month) ?? { totalTickets: 0, downtimeSum: 0, lossSum: 0 };
      group.totalTickets += 1;
      group.downtimeSum += row.downtimeDays;
      group.lossSum += row.serviceLoss;
      groups.set(month, group);
    }

    const sortedMonths = [...groups.keys()].sort();
    let previousLoss: number | null = null;
    return sortedMonths.map((month) => {
      const group = groups.get(month)!;
      const monthlyServiceLoss = round2(group.lossSum);
      const growth = previousLoss !== null && previousLoss > 0 ? round2(((monthlyServiceLoss - previousLoss) / previousLoss) * 100) : null;
      previousLoss = monthlyServiceLoss;
      return {
        month,
        totalTickets: group.totalTickets,
        averageDowntime: round2(group.downtimeSum / group.totalTickets),
        monthlyServiceLoss,
        monthOnMonthGrowthPercent: growth,
        averageServiceLossPerTicket: round2(group.lossSum / group.totalTickets),
      };
    });
  }

  private buildInsights(
    rows: ServiceLossTicketRowDto[],
    byVehicleModel: ServiceLossByGroupRowDto[],
    byHub: ServiceLossByGroupRowDto[],
    slaCompliance: SlaComplianceDto
  ): ServiceLossInsightDto[] {
    const insights: ServiceLossInsightDto[] = [];
    const totalLoss = round2(rows.reduce((sum, row) => sum + row.serviceLoss, 0));

    if (byVehicleModel[0]) {
      insights.push({
        id: "top-model",
        message: `${byVehicleModel[0].groupLabel} contributes ${byVehicleModel[0].percentageContribution}% of the total Service Loss.`,
      });
    }
    if (byHub[0]) {
      insights.push({
        id: "top-hub",
        message: `${byHub[0].groupLabel} Hub contributes ${byHub[0].percentageContribution}% of total Service Loss.`,
      });
    }
    const worstDowntimeModel = [...byVehicleModel].sort((a, b) => b.averageDowntime - a.averageDowntime)[0];
    if (worstDowntimeModel) {
      insights.push({ id: "highest-downtime", message: `${worstDowntimeModel.groupLabel} has the highest average downtime at ${worstDowntimeModel.averageDowntime} days.` });
    }
    const bestHub = [...byHub].sort((a, b) => a.totalServiceLoss - b.totalServiceLoss)[0];
    if (bestHub) {
      insights.push({ id: "best-hub", message: `${bestHub.groupLabel} Hub is the best performing hub with the lowest Service Loss.` });
    }
    const worstHub = byHub[0];
    if (worstHub) {
      insights.push({ id: "worst-hub", message: `${worstHub.groupLabel} Hub is the worst performing hub with the highest Service Loss.` });
    }
    insights.push({ id: "sla-compliance", message: `Overall SLA Compliance is ${slaCompliance.slaCompliancePercent}%.` });
    insights.push({ id: "total-loss", message: `Total Revenue Lost to date is ₹${totalLoss.toLocaleString("en-IN")}.` });

    return insights;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
