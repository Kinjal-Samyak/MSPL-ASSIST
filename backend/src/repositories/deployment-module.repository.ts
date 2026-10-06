import type { Prisma, PrismaClient } from "@prisma/client";

export interface DeploymentMetadataRow {
  deploymentId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  modelCode: string;
  modelName: string;
  hubName: string;
  rentalStatus: "ACTIVE" | "PENDING" | "COMPLETED" | "MAINTENANCE";
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentTimelineRow {
  id: string;
  activityType: string;
  description: string;
  performedAt: Date;
  ticketId: string;
}

export interface DeploymentPaymentRow {
  id: string;
  ticketNumber: string;
  estimatedCharges: Prisma.Decimal | null;
  finalCharges: Prisma.Decimal | null;
  createdAt: Date;
  closedAt: Date | null;
  status: { name: string };
}

export interface DeploymentHistoryRow {
  id: string;
  ticketId: string;
  oldStatus: { name: string } | null;
  newStatus: { name: string };
  remarks: string | null;
  updatedBy: { name: string } | null;
  updatedAt: Date;
}

export class DeploymentModuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listDeploymentMetadata(): Promise<DeploymentMetadataRow[]> {
    const rows = await this.prisma.deployment.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: { name: true },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      deploymentId: row.id,
      customerId: row.customerId,
      customerName: row.customer.name,
      customerPhone: row.customer.registeredMobile,
      mvTrackNumber: row.mvTrackNumber,
      vehicleNumber: row.vehicleNumber,
      modelCode: row.vehicleModel.modelCode,
      modelName: row.vehicleModel.displayName,
      hubName: row.hub.name,
      rentalStatus: row.rentalStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async findDeploymentMetadataById(deploymentId: string): Promise<DeploymentMetadataRow | null> {
    const row = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: { name: true },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      deploymentId: row.id,
      customerId: row.customerId,
      customerName: row.customer.name,
      customerPhone: row.customer.registeredMobile,
      mvTrackNumber: row.mvTrackNumber,
      vehicleNumber: row.vehicleNumber,
      modelCode: row.vehicleModel.modelCode,
      modelName: row.vehicleModel.displayName,
      hubName: row.hub.name,
      rentalStatus: row.rentalStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findTimeline(
    deploymentId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: DeploymentTimelineRow[]; totalRecords: number }> {
    const where: Prisma.TicketActivityWhereInput = {
      ticket: {
        deploymentId,
      },
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketActivity.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          activityType: true,
          description: true,
          performedAt: true,
          ticketId: true,
        },
      }),
      this.prisma.ticketActivity.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findPayments(
    deploymentId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: DeploymentPaymentRow[]; totalRecords: number }> {
    const where: Prisma.TicketWhereInput = {
      deploymentId,
      OR: [{ estimatedCharges: { not: null } }, { finalCharges: { not: null } }],
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          ticketNumber: true,
          estimatedCharges: true,
          finalCharges: true,
          createdAt: true,
          closedAt: true,
          status: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findHistory(
    deploymentId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: DeploymentHistoryRow[]; totalRecords: number }> {
    const where: Prisma.TicketHistoryWhereInput = {
      ticket: {
        deploymentId,
      },
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketHistory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          ticketId: true,
          oldStatus: {
            select: {
              name: true,
            },
          },
          newStatus: {
            select: {
              name: true,
            },
          },
          remarks: true,
          updatedBy: {
            select: {
              name: true,
            },
          },
          updatedAt: true,
        },
      }),
      this.prisma.ticketHistory.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async countOpenTickets(deploymentId: string): Promise<number> {
    return this.prisma.ticket.count({
      where: {
        deploymentId,
        status: {
          name: {
            notIn: ["Closed", "Cancelled"],
          },
        },
      },
    });
  }

  async findLatestTicketStatus(deploymentId: string): Promise<string | null> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { deploymentId },
      orderBy: { updatedAt: "desc" },
      select: {
        status: {
          select: {
            name: true,
          },
        },
      },
    });

    return ticket?.status.name ?? null;
  }
}
