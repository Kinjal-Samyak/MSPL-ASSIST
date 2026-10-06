import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { prismaClient } from "../database";
import { JobCardRepairRepository } from "../repositories/job-card-repair.repository";

export interface JobCardRepairActor {
  userId: string;
  role: string;
}

export interface StartRepairResultDto {
  jobCardId: string;
  repairStartedAt: string;
}

/** The one genuinely new TAT capture point in the Slice-1 framework: the Repair stage clock
 * ("Repair Started -> Ready For Deployment") has no existing signal to proxy from, unlike the
 * other stages, so this is a real new Technician action. */
export class JobCardRepairService {
  constructor(private readonly repository = new JobCardRepairRepository(prismaClient)) {}

  async startRepair(ticketId: string, actor: JobCardRepairActor): Promise<StartRepairResultDto> {
    const jobCard = await this.repository.findContext(ticketId);
    if (!jobCard) throw new NotFoundError(`Job card for ticket ${ticketId} was not found.`);

    if (jobCard.workflowStage === "RFD" && (actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      throw new ConflictError("This job card has reached RFD and is read-only. Only an Administrator can edit it.");
    }
    if ((actor.role !== "ADMIN" && actor.role !== "SERVICE_MANAGER")) {
      if (actor.role !== "TECHNICIAN" || jobCard.technicianId !== actor.userId) {
        throw new ForbiddenError("Only the assigned Technician can start repair on this job card.");
      }
    }
    if (jobCard.repairStartedAt) {
      throw new ConflictError("Repair has already been started on this job card.");
    }

    const updated = await this.repository.startRepair(jobCard.id, ticketId, actor.userId);
    return { jobCardId: updated.id, repairStartedAt: updated.repairStartedAt!.toISOString() };
  }
}
