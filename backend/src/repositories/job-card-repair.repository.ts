import type { JobCardStage, PrismaClient } from "@prisma/client";

export interface JobCardRepairContext {
  id: string;
  technicianId: string;
  workflowStage: JobCardStage;
  repairStartedAt: Date | null;
}

export class JobCardRepairRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findContext(ticketId: string): Promise<JobCardRepairContext | null> {
    return this.prisma.jobCard.findUnique({
      where: { ticketId },
      select: { id: true, technicianId: true, workflowStage: true, repairStartedAt: true },
    });
  }

  async startRepair(jobCardId: string, ticketId: string, performedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobCard.update({
        where: { id: jobCardId },
        data: { repairStartedAt: new Date() },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "WORKFLOW_REPAIR_STARTED",
          description: "Technician started repair.",
          performedById,
          performedAt: new Date(),
        },
      });
      return updated;
    });
  }
}
