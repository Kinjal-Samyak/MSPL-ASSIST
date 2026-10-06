import type { Prisma, PrismaClient, TicketWorkflowStage } from "@prisma/client";
import type { WorkshopWorkbenchListQueryDto, WorkshopWorkbenchSummaryDto } from "../dto/workshop-workbench.dto";

export interface WorkshopWorkbenchJobCardRow {
  id: string;
  jobCardNumber: string;
  workflowStage: "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" | "RFD";
  lastEditedAt: Date | null;
  updatedAt: Date;
  technicianId: string;
  technician: { name: string };
  ticket: {
    id: string;
    ticketNumber: string;
    priority: string;
    workflowStage: TicketWorkflowStage;
    status: { name: string };
    customer: { name: string; registeredMobile: string };
    deployment: { vehicleNumber: string; vehicleModel: { displayName: string }; hub: { name: string } } | null;
  };
}

const listSelect = {
  id: true,
  jobCardNumber: true,
  workflowStage: true,
  lastEditedAt: true,
  updatedAt: true,
  technicianId: true,
  technician: { select: { name: true } },
  ticket: {
    select: {
      id: true,
      ticketNumber: true,
      priority: true,
      workflowStage: true,
      status: { select: { name: true } },
      customer: { select: { name: true, registeredMobile: true } },
      deployment: {
        select: {
          vehicleNumber: true,
          vehicleModel: { select: { displayName: true } },
          hub: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.JobCardSelect;

export class WorkshopWorkbenchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(): Promise<WorkshopWorkbenchSummaryDto> {
    const [openJobCards, openTickets, assignedToTechnician, inProgress, completed, readyForDeployment, returnedToWorkshop] =
      await this.prisma.$transaction([
        this.prisma.jobCard.count({ where: { ticket: { closedAt: null } } }),
        this.prisma.ticket.count({ where: { closedAt: null } }),
        this.prisma.jobCard.count({ where: { workflowStage: "IN_PROGRESS", lastEditedAt: null } }),
        this.prisma.jobCard.count({
          where: {
            OR: [{ workflowStage: "IN_PROGRESS", lastEditedAt: { not: null } }, { workflowStage: "WAITING_PARTS" }],
          },
        }),
        this.prisma.jobCard.count({ where: { workflowStage: "COMPLETED" } }),
        this.prisma.jobCard.count({ where: { workflowStage: "RFD" } }),
        this.prisma.ticket.count({ where: { closedAt: null, returnedToWorkshopCount: { gt: 0 } } }),
      ]);

    return { openJobCards, openTickets, assignedToTechnician, inProgress, completed, readyForDeployment, returnedToWorkshop };
  }

  private buildStatusWhere(status: WorkshopWorkbenchListQueryDto["status"]): Prisma.JobCardWhereInput {
    if (status === "ASSIGNED") {
      return { workflowStage: "IN_PROGRESS", lastEditedAt: null };
    }
    if (status === "IN_PROGRESS") {
      return {
        OR: [{ workflowStage: "IN_PROGRESS", lastEditedAt: { not: null } }, { workflowStage: "WAITING_PARTS" }],
      };
    }
    if (status === "COMPLETED") {
      return { workflowStage: "COMPLETED" };
    }
    if (status === "RFD") {
      return { workflowStage: "RFD" };
    }
    return {};
  }

  async list(
    query: WorkshopWorkbenchListQueryDto
  ): Promise<{ items: WorkshopWorkbenchJobCardRow[]; totalRecords: number }> {
    const conditions: Prisma.JobCardWhereInput[] = [this.buildStatusWhere(query.status)];

    if (query.technicianId) {
      conditions.push({ technicianId: query.technicianId });
    }
    conditions.push({
      ticket: {
        deletedAt: null,
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.hub ? { deployment: { hub: { name: query.hub } } } : {}),
      },
    });
    if (query.search) {
      conditions.push({
        OR: [
          { jobCardNumber: { contains: query.search, mode: "insensitive" } },
          { ticket: { ticketNumber: { contains: query.search, mode: "insensitive" } } },
          { ticket: { customer: { registeredMobile: { contains: query.search } } } },
        ],
      });
    }

    const where: Prisma.JobCardWhereInput = { AND: conditions };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.jobCard.findMany({
        where,
        select: listSelect,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.jobCard.count({ where }),
    ]);

    return { items, totalRecords };
  }
}
