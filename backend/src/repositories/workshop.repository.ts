import type { Prisma, PrismaClient, Priority } from "@prisma/client";
import type {
  AssignWorkshopJobDto,
  CreateWorkshopJobDto,
  UpdateWorkshopJobDto,
  WorkshopJobListQueryDto,
} from "../dto/workshop.dto";

export interface WorkshopJobRecord {
  id: string;
  ticketNumber: string;
  status: string;
  priority: Priority;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deploymentId: string;
  mvTrackNumber: string;
  vehicleNumber: string;
  hubName: string;
  technicianId: string | null;
  technicianName: string | null;
  issueCategory: string;
  issueDescription: string;
  createdAt: Date;
  updatedAt: Date;
  eta: Date | null;
  coordinatorNotes: string | null;
  estimatedCharges: Prisma.Decimal | null;
  finalCharges: Prisma.Decimal | null;
}

export interface WorkshopTimelineRow {
  id: string;
  activityType: string;
  description: string;
  performedAt: Date;
  ticketId: string;
}

export interface WorkshopPartRow {
  id: string;
  issueDescription: string;
  issueStatus: string;
  sequenceNumber: number;
  issueCategory: { name: string };
}

export interface WorkshopAttachmentRow {
  id: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
}

type WorkshopPrismaClient = PrismaClient | Prisma.TransactionClient;

export class WorkshopRepository {
  constructor(private readonly prisma: WorkshopPrismaClient) {}

  async listJobs(
    query: WorkshopJobListQueryDto
  ): Promise<{ items: WorkshopJobRecord[]; totalRecords: number }> {
    const where: Prisma.TicketWhereInput = {
      deploymentId: {
        not: null,
      },
      activities: {
        some: {
          activityType: "WORKSHOP_JOB_CREATED",
        },
      },
      ...(query.search
        ? {
            OR: [
              { ticketNumber: { contains: query.search, mode: "insensitive" } },
              { issueDescription: { contains: query.search, mode: "insensitive" } },
              { customer: { name: { contains: query.search, mode: "insensitive" } } },
              { deployment: { vehicleNumber: { contains: query.search, mode: "insensitive" } } },
              { deployment: { mvTrackNumber: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(query.status
        ? {
            status: {
              name: {
                equals: query.status,
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.technicianId ? { assignedToId: query.technicianId } : {}),
      ...(query.hubName
        ? {
            deployment: {
              hub: {
                name: {
                  contains: query.hubName,
                  mode: "insensitive",
                },
              },
            },
          }
        : {}),
    };

    const [items, totalRecords] = await this.runReadBatch(
      this.prisma.ticket.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toOrderBy(query.sortBy, query.sortOrder),
        include: this.jobInclude(),
      }),
      this.prisma.ticket.count({ where })
    );

    return {
      items: items.map((item: Prisma.TicketGetPayload<{ include: ReturnType<WorkshopRepository["jobInclude"]> }>) =>
        this.toJobRecord(item)
      ),
      totalRecords,
    };
  }

  async findJobById(jobId: string): Promise<WorkshopJobRecord | null> {
    const row = await this.prisma.ticket.findUnique({
      where: { id: jobId },
      include: this.jobInclude(),
    });
    if (!row || !row.deployment) {
      return null;
    }
    return this.toJobRecord(row);
  }

  async findActiveWorkshopJobByDeployment(deploymentId: string): Promise<WorkshopJobRecord | null> {
    const row = await this.prisma.ticket.findFirst({
      where: {
        deploymentId,
        activities: { some: { activityType: "WORKSHOP_JOB_CREATED" } },
        status: {
          name: {
            notIn: ["Completed", "Cancelled"],
            mode: "insensitive",
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: this.jobInclude(),
    });
    return row ? this.toJobRecord(row) : null;
  }

  async findDeploymentById(
    deploymentId: string
  ): Promise<{ id: string; customerId: string; mvTrackNumber: string; vehicleNumber: string } | null> {
    return this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: {
        id: true,
        customerId: true,
        mvTrackNumber: true,
        vehicleNumber: true,
      },
    });
  }

  async findStatusIdByName(statusName: string): Promise<string | null> {
    const status = await this.prisma.statusMaster.findFirst({
      where: {
        active: true,
        deletedAt: null,
        name: {
          equals: statusName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
    return status?.id ?? null;
  }

  async findIssueCategoryById(issueCategoryId: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.issueCategory.findFirst({
      where: {
        id: issueCategoryId,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async createJob(
    payload: CreateWorkshopJobDto & { ticketNumber: string; statusId: string; customerId: string }
  ): Promise<WorkshopJobRecord> {
    const row = await this.prisma.ticket.create({
      data: {
        ticketNumber: payload.ticketNumber,
        customerId: payload.customerId,
        deploymentId: payload.deploymentId,
        issueCategoryId: payload.issueCategoryId,
        statusId: payload.statusId,
        // ADMIN is the existing persistence value for the Hub Team entry point.
        source: "ADMIN",
        priority: payload.priority,
        issueDescription: payload.issueDescription,
        estimatedCharges: payload.estimatedCharges,
        coordinatorNotes: payload.coordinatorNotes,
        eta: payload.eta ? new Date(payload.eta) : null,
        sendUpdate: false,
        issueItems: {
          create: {
            issueCategoryId: payload.issueCategoryId,
            issueDescription: payload.issueDescription,
            issueStatus: "Open",
            sequenceNumber: 1,
          },
        },
        activities: {
          create: {
            activityType: "WORKSHOP_JOB_CREATED",
            description: "Workshop downtime started when the ticket was created.",
            performedAt: new Date(),
          },
        },
      },
      include: this.jobInclude(),
    });
    return this.toJobRecord(row);
  }

  async updateJob(jobId: string, payload: UpdateWorkshopJobDto): Promise<WorkshopJobRecord> {
    const row = await this.prisma.ticket.update({
      where: { id: jobId },
      data: {
        ...(payload.issueDescription != null ? { issueDescription: payload.issueDescription } : {}),
        ...(payload.coordinatorNotes !== undefined ? { coordinatorNotes: payload.coordinatorNotes } : {}),
        ...(payload.eta !== undefined ? { eta: payload.eta ? new Date(payload.eta) : null } : {}),
        ...(payload.estimatedCharges !== undefined ? { estimatedCharges: payload.estimatedCharges } : {}),
        ...(payload.finalCharges !== undefined ? { finalCharges: payload.finalCharges } : {}),
        ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      },
      include: this.jobInclude(),
    });
    return this.toJobRecord(row);
  }

  async assignJob(jobId: string, payload: AssignWorkshopJobDto): Promise<WorkshopJobRecord> {
    const row = await this.prisma.ticket.update({
      where: { id: jobId },
      data: {
        assignedToId: payload.technicianId,
      },
      include: this.jobInclude(),
    });
    return this.toJobRecord(row);
  }

  async updateJobStatus(jobId: string, statusId: string): Promise<WorkshopJobRecord> {
    const row = await this.prisma.ticket.update({
      where: { id: jobId },
      data: {
        statusId,
      },
      include: this.jobInclude(),
    });
    return this.toJobRecord(row);
  }

  async appendIssueCategory(
    jobId: string,
    issueCategoryId: string,
    issueDescription: string
  ): Promise<void> {
    const lastItem = await this.prisma.ticketIssueItem.findFirst({
      where: { ticketId: jobId },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    });
    await this.prisma.ticketIssueItem.create({
      data: {
        ticketId: jobId,
        issueCategoryId,
        issueDescription,
        issueStatus: "Open",
        sequenceNumber: (lastItem?.sequenceNumber ?? 0) + 1,
      },
    });
  }

  async addActivity(jobId: string, activityType: string, description: string): Promise<void> {
    await this.prisma.ticketActivity.create({
      data: {
        ticketId: jobId,
        activityType,
        description,
        performedAt: new Date(),
      },
    });
  }

  async getTimeline(
    jobId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: WorkshopTimelineRow[]; totalRecords: number }> {
    const where: Prisma.TicketActivityWhereInput = { ticketId: jobId };
    const [items, totalRecords] = await this.runReadBatch(
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
      this.prisma.ticketActivity.count({ where })
    );
    return { items, totalRecords };
  }

  async getParts(
    jobId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: WorkshopPartRow[]; totalRecords: number }> {
    const where: Prisma.TicketIssueItemWhereInput = { ticketId: jobId };
    const [items, totalRecords] = await this.runReadBatch(
      this.prisma.ticketIssueItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sequenceNumber: "asc" },
        select: {
          id: true,
          issueDescription: true,
          issueStatus: true,
          sequenceNumber: true,
          issueCategory: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.ticketIssueItem.count({ where })
    );
    return { items, totalRecords };
  }

  async getAttachments(
    jobId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: WorkshopAttachmentRow[]; totalRecords: number }> {
    const where: Prisma.TicketAttachmentWhereInput = { ticketId: jobId };
    const [items, totalRecords] = await this.runReadBatch(
      this.prisma.ticketAttachment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          uploadedAt: true,
        },
      }),
      this.prisma.ticketAttachment.count({ where })
    );
    return { items, totalRecords };
  }

  async countJobsByStatus(statusName: string): Promise<number> {
    return this.prisma.ticket.count({
      where: {
        deploymentId: { not: null },
        status: {
          name: {
            equals: statusName,
            mode: "insensitive",
          },
        },
      },
    });
  }

  async countJobs(): Promise<number> {
    return this.prisma.ticket.count({
      where: {
        deploymentId: { not: null },
      },
    });
  }

  private jobInclude(): Prisma.TicketInclude {
    return {
      customer: {
        select: {
          id: true,
          name: true,
          registeredMobile: true,
        },
      },
      deployment: {
        select: {
          id: true,
          mvTrackNumber: true,
          vehicleNumber: true,
          hub: {
            select: {
              name: true,
            },
          },
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
      issueCategory: {
        select: {
          name: true,
        },
      },
      status: {
        select: {
          name: true,
        },
      },
    };
  }

  private toOrderBy(sortBy: WorkshopJobListQueryDto["sortBy"], sortOrder: WorkshopJobListQueryDto["sortOrder"]): Prisma.TicketOrderByWithRelationInput {
    switch (sortBy) {
      case "createdAt":
        return { createdAt: sortOrder };
      case "ticketNumber":
        return { ticketNumber: sortOrder };
      case "status":
        return { status: { name: sortOrder } };
      case "priority":
        return { priority: sortOrder };
      case "customerName":
        return { customer: { name: sortOrder } };
      case "vehicleNumber":
        return { deployment: { vehicleNumber: sortOrder } };
      default:
        return { updatedAt: sortOrder };
    }
  }

  private toJobRecord(row: any): WorkshopJobRecord {
    return {
      id: row.id,
      ticketNumber: row.ticketNumber,
      status: row.status.name,
      priority: row.priority,
      customerId: row.customer.id,
      customerName: row.customer.name,
      customerPhone: row.customer.registeredMobile,
      deploymentId: row.deployment.id,
      mvTrackNumber: row.deployment.mvTrackNumber,
      vehicleNumber: row.deployment.vehicleNumber,
      hubName: row.deployment.hub.name,
      technicianId: row.assignedTo?.id ?? null,
      technicianName: row.assignedTo?.name ?? null,
      issueCategory: row.issueCategory.name,
      issueDescription: row.issueDescription,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      eta: row.eta,
      coordinatorNotes: row.coordinatorNotes,
      estimatedCharges: row.estimatedCharges,
      finalCharges: row.finalCharges,
    };
  }

  private runReadBatch<TFirst, TSecond>(
    first: Prisma.PrismaPromise<TFirst>,
    second: Prisma.PrismaPromise<TSecond>
  ): Promise<[TFirst, TSecond]> {
    if ("$transaction" in this.prisma && typeof this.prisma.$transaction === "function") {
      return this.prisma.$transaction([first, second]) as Promise<[TFirst, TSecond]>;
    }
    return Promise.all([first, second]);
  }
}
