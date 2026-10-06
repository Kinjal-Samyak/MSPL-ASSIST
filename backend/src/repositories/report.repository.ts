import type { Prisma, PrismaClient } from "@prisma/client";
import type { ReportQueryDto } from "../dto/report.dto";

export class ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getKpiSummary() {
    const [totalDeployments, activeDeployments, customerCount, openTickets, workshopJobs, notificationFailures] =
      await this.prisma.$transaction([
        this.prisma.deployment.count(),
        this.prisma.deployment.count({ where: { rentalStatus: "ACTIVE" } }),
        this.prisma.customer.count(),
        this.prisma.ticket.count({ where: { closedAt: null } }),
        this.prisma.ticket.count({ where: { assignedToId: { not: null }, closedAt: null } }),
        this.prisma.notificationMessage.count({ where: { status: "FAILED" } }),
      ]);

    const charges = await this.prisma.ticket.aggregate({
      _sum: {
        finalCharges: true,
        estimatedCharges: true,
      },
    });

    return {
      totalDeployments,
      activeDeployments,
      customerCount,
      openTickets,
      workshopJobs,
      notificationFailures,
      revenue: Number(charges._sum.finalCharges ?? 0),
      processingFees: Number(charges._sum.estimatedCharges ?? 0),
      securityDeposits: 0,
    };
  }

  async getTicketTrend() {
    const windowStart = new Date();
    windowStart.setUTCMonth(windowStart.getUTCMonth() - 5);
    return this.prisma.ticket.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async getTicketsByStatus(query: ReportQueryDto) {
    return this.prisma.ticket.groupBy({
      by: ["statusId"],
      _count: { _all: true },
      where: this.toTicketWhere(query),
    });
  }

  async getStatusNames(statusIds: string[]) {
    if (statusIds.length === 0) return [];
    return this.prisma.statusMaster.findMany({
      where: { id: { in: statusIds } },
      select: { id: true, name: true },
    });
  }

  async getTicketsByCategory(query: ReportQueryDto) {
    return this.prisma.ticket.groupBy({
      by: ["issueCategoryId"],
      _count: { _all: true },
      where: this.toTicketWhere(query),
    });
  }

  async getCategoryNames(categoryIds: string[]) {
    if (categoryIds.length === 0) return [];
    return this.prisma.issueCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
  }

  async getNotificationsByChannel(query: ReportQueryDto) {
    return this.prisma.notificationMessage.groupBy({
      by: ["channel"],
      _count: { _all: true },
      where: this.toNotificationWhere(query),
    });
  }

  async getDashboardCounts() {
    const [tickets, customers, vehicles, deployments, workshop, notifications, admin] =
      await this.prisma.$transaction([
        this.prisma.ticket.count(),
        this.prisma.customer.count(),
        this.prisma.deployment.count(),
        this.prisma.deployment.count(),
        this.prisma.ticket.count(),
        this.prisma.notificationMessage.count(),
        this.prisma.user.count(),
      ]);
    return { tickets, customers, vehicles, deployments, workshop, notifications, admin };
  }

  async getTicketReport(query: ReportQueryDto) {
    const where = this.toTicketWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toTicketOrderBy(query.sortBy, query.sortOrder),
        include: {
          customer: { select: { name: true } },
          deployment: { include: { hub: { select: { name: true } } } },
          assignedTo: { select: { name: true } },
          status: { select: { name: true } },
          issueCategory: { select: { name: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { items, totalRecords };
  }

  async getCustomerReport(query: ReportQueryDto) {
    const where = this.toCustomerWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toCustomerOrderBy(query.sortBy, query.sortOrder),
        include: { _count: { select: { deployments: true, tickets: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, totalRecords };
  }

  async getVehicleReport(query: ReportQueryDto) {
    return this.getDeploymentReport(query);
  }

  async getDeploymentReport(query: ReportQueryDto) {
    const where = this.toDeploymentWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.deployment.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toDeploymentOrderBy(query.sortBy, query.sortOrder),
        include: {
          customer: { select: { name: true } },
          vehicleModel: { select: { displayName: true } },
          hub: { select: { name: true } },
        },
      }),
      this.prisma.deployment.count({ where }),
    ]);
    return { items, totalRecords };
  }

  async getWorkshopReport(query: ReportQueryDto) {
    return this.getTicketReport(query);
  }

  async getNotificationReport(query: ReportQueryDto) {
    const where = this.toNotificationWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.notificationMessage.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toNotificationOrderBy(query.sortBy, query.sortOrder),
      }),
      this.prisma.notificationMessage.count({ where }),
    ]);
    return { items, totalRecords };
  }

  async getAdminReport(query: ReportQueryDto) {
    const where = this.toAdminWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toAdminOrderBy(query.sortBy, query.sortOrder),
        include: { userHubs: { include: { hub: { select: { name: true } } } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, totalRecords };
  }

  private toTicketWhere(query: ReportQueryDto): Prisma.TicketWhereInput {
    const riderFilter = query.rider ?? query.search;
    return {
      ...(query.search
        ? {
            OR: [
              { ticketNumber: { contains: query.search, mode: "insensitive" } },
              { issueDescription: { contains: query.search, mode: "insensitive" } },
              { customer: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.hubId ? { deployment: { hubId: query.hubId } } : {}),
      ...(query.vehicle ? { deployment: { vehicleNumber: { contains: query.vehicle, mode: "insensitive" } } } : {}),
      ...(query.technicianId ? { assignedToId: query.technicianId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: { name: { equals: query.status, mode: "insensitive" } } } : {}),
      ...(query.category ? { issueCategory: { name: { equals: query.category, mode: "insensitive" } } } : {}),
      ...(riderFilter ? { customer: { name: { contains: riderFilter, mode: "insensitive" } } } : {}),
    };
  }

  private toCustomerWhere(query: ReportQueryDto): Prisma.CustomerWhereInput {
    const riderFilter = query.rider ?? query.search;
    return {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { registeredMobile: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.customerId ? { id: query.customerId } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(riderFilter ? { name: { contains: riderFilter, mode: "insensitive" } } : {}),
    };
  }

  private toDeploymentWhere(query: ReportQueryDto): Prisma.DeploymentWhereInput {
    const riderFilter = query.rider ?? query.search;
    return {
      ...(query.search
        ? {
            OR: [
              { vehicleNumber: { contains: query.search, mode: "insensitive" } },
              { mvTrackNumber: { contains: query.search, mode: "insensitive" } },
              { customer: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.hubId ? { hubId: query.hubId } : {}),
      ...(query.vehicleModelId ? { vehicleModelId: query.vehicleModelId } : {}),
      ...(query.vehicle ? { vehicleNumber: { contains: query.vehicle, mode: "insensitive" } } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { rentalStatus: query.status as any } : {}),
      ...(riderFilter ? { customer: { name: { contains: riderFilter, mode: "insensitive" } } } : {}),
    };
  }

  private toNotificationWhere(query: ReportQueryDto): Prisma.NotificationMessageWhereInput {
    return {
      ...(query.search
        ? {
            OR: [
              { recipient: { contains: query.search, mode: "insensitive" } },
              { sourceEntityId: { contains: query.search, mode: "insensitive" } },
              { eventType: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.category ? { channel: query.category } : {}),
    };
  }

  private toAdminWhere(query: ReportQueryDto): Prisma.UserWhereInput {
    return {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { mobile: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.status ? { role: query.status as any } : {}),
      ...(query.hubId ? { userHubs: { some: { hubId: query.hubId } } } : {}),
    };
  }

  private toTicketOrderBy(sortBy: string, sortOrder: "asc" | "desc"): Prisma.TicketOrderByWithRelationInput {
    if (sortBy === "ticketNumber") return { ticketNumber: sortOrder };
    if (sortBy === "updatedAt") return { updatedAt: sortOrder };
    return { createdAt: sortOrder };
  }

  private toCustomerOrderBy(sortBy: string, sortOrder: "asc" | "desc"): Prisma.CustomerOrderByWithRelationInput {
    if (sortBy === "name") return { name: sortOrder };
    if (sortBy === "updatedAt") return { updatedAt: sortOrder };
    return { createdAt: sortOrder };
  }

  private toDeploymentOrderBy(
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): Prisma.DeploymentOrderByWithRelationInput {
    if (sortBy === "vehicleNumber") return { vehicleNumber: sortOrder };
    if (sortBy === "updatedAt") return { updatedAt: sortOrder };
    return { createdAt: sortOrder };
  }

  private toNotificationOrderBy(
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): Prisma.NotificationMessageOrderByWithRelationInput {
    if (sortBy === "channel") return { channel: sortOrder };
    if (sortBy === "status") return { status: sortOrder };
    if (sortBy === "updatedAt") return { updatedAt: sortOrder };
    return { createdAt: sortOrder };
  }

  private toAdminOrderBy(sortBy: string, sortOrder: "asc" | "desc"): Prisma.UserOrderByWithRelationInput {
    if (sortBy === "name") return { name: sortOrder };
    if (sortBy === "email") return { email: sortOrder };
    if (sortBy === "updatedAt") return { updatedAt: sortOrder };
    return { createdAt: sortOrder };
  }
}
