import type { Prisma, PrismaClient } from "@prisma/client";
import type { ServiceLossFiltersDto } from "../dto/service-loss-analytics.dto";

const ticketAnalyticsSelect = {
  id: true,
  ticketNumber: true,
  createdAt: true,
  rfdAt: true,
  serviceLossAmount: true,
  serviceLossDailyRental: true,
  status: { select: { name: true } },
  customer: { select: { name: true } },
  serviceTl: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  deployment: {
    select: {
      vehicleNumber: true,
      vehicleModel: { select: { id: true, displayName: true, slaTargetDays: true } },
      hub: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.TicketSelect;

export type TicketAnalyticsRow = Prisma.TicketGetPayload<{ select: typeof ticketAnalyticsSelect }>;

export class ServiceLossAnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  buildWhere(filters: ServiceLossFiltersDto): Prisma.TicketWhereInput {
    const conditions: Prisma.TicketWhereInput[] = [
      { deletedAt: null },
      { deploymentId: { not: null } },
    ];

    if (filters.from || filters.to) {
      conditions.push({
        createdAt: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
      });
    }
    if (filters.hubId) conditions.push({ deployment: { hubId: filters.hubId } });
    if (filters.vehicleModelId) conditions.push({ deployment: { vehicleModelId: filters.vehicleModelId } });
    if (filters.serviceTlId) conditions.push({ serviceTlId: filters.serviceTlId });
    if (filters.technicianId) conditions.push({ assignedToId: filters.technicianId });
    if (filters.status === "OPEN") conditions.push({ rfdAt: null });
    if (filters.status === "CLOSED") conditions.push({ rfdAt: { not: null } });

    return { AND: conditions };
  }

  async findFilteredTickets(filters: ServiceLossFiltersDto): Promise<TicketAnalyticsRow[]> {
    return this.prisma.ticket.findMany({
      where: this.buildWhere(filters),
      select: ticketAnalyticsSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async findRatesForModels(vehicleModelIds: string[]) {
    if (vehicleModelIds.length === 0) return [];
    return this.prisma.vehicleModelRate.findMany({
      where: { vehicleModelId: { in: vehicleModelIds } },
      orderBy: { effectiveFrom: "asc" },
    });
  }
}
