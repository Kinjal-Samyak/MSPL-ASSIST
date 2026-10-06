import type { Prisma, PrismaClient } from "@prisma/client";
import { prismaClient } from "../database";
import type { InventoryProvider } from "../interfaces/operational-providers.interface";
import { OperationalProviders } from "./operational-providers";
import { NotFoundError, ValidationError } from "../errors";
import type {
  TechnicianDashboardDto, TechnicianInspectionInputDto, TechnicianJobDetailDto,
  TechnicianJobDto, TechnicianJobListDto, TechnicianJobListQueryDto,
  TechnicianPhotoInputDto, TechnicianRepairNoteInputDto, TechnicianTimelineItemDto,
} from "../dto/technician-console.dto";

const CLOSED_STATUS = "Closed";
const MILESTONES = ["ASSIGNED", "VEHICLE_RECEIVED", "INSPECTION_STARTED", "INSPECTION_COMPLETED", "REPAIR_STARTED", "WAITING_FOR_PARTS", "REPAIR_COMPLETED", "QUALITY_CHECK", "READY_FOR_DELIVERY"] as const;
type TechnicianMilestone = (typeof MILESTONES)[number];
const ACTIVITY_PREFIX = "TECHNICIAN_";
const MILESTONE_ACTIVITY = `${ACTIVITY_PREFIX}MILESTONE`;

const jobSelect = {
  id: true, ticketNumber: true, issueDescription: true, priority: true, createdAt: true,
  updatedAt: true, closedAt: true, eta: true, coordinatorNotes: true,
  workflowStage: true,
  jobCard: { select: { workflowStage: true } },
  status: { select: { name: true } }, customer: { select: { name: true } },
  deployment: { select: { mvTrackNumber: true } }, issueCategory: { select: { name: true } },
} satisfies Prisma.TicketSelect;

/** Uses existing Ticket activity, attachment, assignment and history persistence only. */
export class TechnicianConsoleService {
  constructor(
    private readonly prisma: PrismaClient = prismaClient,
    private readonly inventoryProvider: InventoryProvider = OperationalProviders.inventoryProvider
  ) {}

  async dashboard(technicianId: string): Promise<TechnicianDashboardDto> {
    const jobs = await this.prisma.ticket.findMany({ where: { assignedToId: technicianId }, select: { status: { select: { name: true } }, createdAt: true, closedAt: true, eta: true } });
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const open = jobs.filter((job) => job.status.name !== CLOSED_STATUS);
    const completed = jobs.filter((job) => job.closedAt && job.closedAt >= today);
    const withSla = jobs.filter((job) => job.eta);

    const jobCards = await this.prisma.jobCard.findMany({
      where: { technicianId },
      select: {
        workflowStage: true,
        createdAt: true,
        actualCompletionAt: true,
        readyForDeliveryAt: true,
        ticket: { select: { eta: true } },
      },
    });
    const jobCardStageCount = (stage: string) => jobCards.filter((jobCard) => jobCard.workflowStage === stage).length;

    /** Job Card KPIs (Document 9): "Ready for Deployment" only counts job cards marked Ready for
     * Delivery today; "Overdue Jobs" is a Job Card SLA breach (ticket ETA passed and the job card
     * hasn't reached RFD yet), not a raw ticket-ETA count; "Average Repair Time" is total elapsed
     * duration across every job card (completion time if done, else time-so-far) divided by the
     * job card count - not just closed tickets. */
    const rfdToday = jobCards.filter(
      (jobCard) => jobCard.workflowStage === "RFD" && jobCard.readyForDeliveryAt !== null && jobCard.readyForDeliveryAt >= today
    ).length;
    const overdueJobCards = jobCards.filter(
      (jobCard) => jobCard.workflowStage !== "RFD" && jobCard.ticket.eta !== null && jobCard.ticket.eta < now
    ).length;
    const repairDurations = jobCards.map((jobCard) => {
      const end = jobCard.actualCompletionAt ?? jobCard.readyForDeliveryAt ?? now;
      return (end.getTime() - jobCard.createdAt.getTime()) / 3_600_000;
    });
    const averageRepairTimeHours = repairDurations.length
      ? Number((repairDurations.reduce((sum, value) => sum + value, 0) / repairDurations.length).toFixed(1))
      : 0;

    return {
      assignedJobs: open.length,
      jobsInProgress: open.filter((job) => job.status.name === "In Progress").length,
      waitingForParts: open.filter((job) => job.status.name === "Waiting for Parts").length,
      completedToday: completed.length,
      averageRepairTimeHours,
      slaCompliancePercent: withSla.length ? Math.round((withSla.filter((job) => !job.closedAt || job.closedAt <= job.eta!).length / withSla.length) * 100) : 0,
      overdueJobs: overdueJobCards,
      jobCardStageCounts: {
        IN_PROGRESS: jobCardStageCount("IN_PROGRESS"),
        WAITING_PARTS: jobCardStageCount("WAITING_PARTS"),
        COMPLETED: jobCardStageCount("COMPLETED"),
        RFD: rfdToday,
      },
    };
  }

  async listJobs(technicianId: string, query: TechnicianJobListQueryDto): Promise<TechnicianJobListDto> {
    const registrationMatches = query.search
      ? (await this.inventoryProvider.listVehicles())
          .filter((vehicle) => vehicle.registrationNumber?.toLowerCase().includes(query.search!.toLowerCase()))
          .map((vehicle) => vehicle.mvTrackNumber)
      : [];
    const where: Prisma.TicketWhereInput = { assignedToId: technicianId, ...(query.search ? { OR: [
      { ticketNumber: { contains: query.search, mode: "insensitive" } },
      { customer: { name: { contains: query.search, mode: "insensitive" } } },
      { deployment: { mvTrackNumber: { contains: query.search, mode: "insensitive" } } },
      ...(registrationMatches.length ? [{ deployment: { mvTrackNumber: { in: registrationMatches } } }] : []),
    ] } : {}) };
    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({ where, select: jobSelect, orderBy: { updatedAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.ticket.count({ where }),
    ]);
    return { items: await Promise.all(jobs.map((job) => this.toJob(job))), total, page: query.page, pageSize: query.pageSize };
  }

  async getJob(technicianId: string, ticketId: string): Promise<TechnicianJobDetailDto> {
    const job = await this.prisma.ticket.findFirst({ where: { id: ticketId, assignedToId: technicianId }, select: jobSelect });
    if (!job) throw new NotFoundError("Assigned technician job was not found.");
    const [mapped, inventory] = await Promise.all([
      this.toJob(job), job.deployment?.mvTrackNumber ? this.inventoryProvider.getVehicleDetails(job.deployment.mvTrackNumber) : Promise.resolve(null),
    ]);
    return { ...mapped,
      asset: { mvTrackNumber: inventory?.mvTrackNumber ?? job.deployment?.mvTrackNumber ?? null, vehicleModel: inventory?.modelName ?? null, registrationNumber: inventory?.registrationNumber ?? null, hub: inventory?.hub?.hubName ?? null, deploymentStatus: inventory?.status ?? null, currentRider: inventory?.currentCustomerName ?? null },
      complaint: { issueCategory: job.issueCategory.name, description: job.issueDescription, riderRemarks: null, coordinatorNotes: job.coordinatorNotes },
      parts: { available: false, message: "Parts workflow will be enabled in a future, isolated milestone." },
    };
  }

  async advanceMilestone(technicianId: string, ticketId: string, action?: string, remarks?: string): Promise<{ milestone: TechnicianMilestone }> {
    await this.assertAssigned(technicianId, ticketId);
    const current = await this.currentMilestone(ticketId);
    const allowed = this.allowedNextMilestones(current);
    // Waiting for Parts is optional; the default guided action proceeds directly to Repair Completed.
    const next = action ? action as TechnicianMilestone : allowed[allowed.length - 1];
    if (!next || !allowed.includes(next)) throw new ValidationError("Select one of the permitted next workflow actions.");
    if (next === "READY_FOR_DELIVERY") await this.assertCompletionChecklist(ticketId);
    await this.activity(ticketId, technicianId, MILESTONE_ACTIVITY, `Technician workflow advanced to ${next}.`, remarks, { milestone: next });
    return { milestone: next };
  }

  async recordInspection(technicianId: string, ticketId: string, input: TechnicianInspectionInputDto) {
    if (!input.initialFindings?.trim()) throw new ValidationError("Initial findings are required.");
    await this.assertAssigned(technicianId, ticketId);
    if (await this.currentMilestone(ticketId) !== "INSPECTION_STARTED") throw new ValidationError("Start inspection before recording inspection findings.");
    await this.activity(ticketId, technicianId, `${ACTIVITY_PREFIX}INSPECTION_RECORDED`, "Technician inspection recorded.", undefined, this.cleanInspection(input));
    return { recorded: true };
  }

  async addRepairNote(technicianId: string, ticketId: string, input: TechnicianRepairNoteInputDto) {
    if (!Object.values(input).some((value) => value?.trim())) throw new ValidationError("Enter at least one repair note.");
    await this.assertAssigned(technicianId, ticketId);
    await this.activity(ticketId, technicianId, `${ACTIVITY_PREFIX}REPAIR_NOTE_ADDED`, "Technician repair note added.", undefined, this.cleanNote(input));
    return { recorded: true };
  }

  async addPhoto(technicianId: string, ticketId: string, input: TechnicianPhotoInputDto) {
    if (!input.reference?.trim()) throw new ValidationError("Photo reference is required.");
    await this.assertAssigned(technicianId, ticketId);
    await this.prisma.$transaction([
      this.prisma.ticketAttachment.create({ data: { ticketId, fileUrl: input.reference.trim(), fileType: input.photoType } }),
      this.prisma.ticketActivity.create({ data: { ticketId, performedById: technicianId, performedAt: new Date(), activityType: `${ACTIVITY_PREFIX}PHOTO_ATTACHED`, description: "Technician photo reference attached.", metadata: { photoType: input.photoType } } }),
    ]);
    return { recorded: true };
  }

  async timeline(technicianId: string, ticketId: string): Promise<TechnicianTimelineItemDto[]> {
    await this.assertAssigned(technicianId, ticketId);
    const entries = await this.prisma.ticketActivity.findMany({ where: { ticketId, activityType: { startsWith: ACTIVITY_PREFIX } }, orderBy: { performedAt: "asc" }, include: { performedBy: { select: { name: true } } } });
    return entries.map((entry) => ({ id: entry.id, action: entry.activityType.slice(ACTIVITY_PREFIX.length), remarks: entry.description, createdAt: entry.performedAt.toISOString(), technicianName: entry.performedBy?.name ?? "Technician" }));
  }

  async repairHistory(technicianId: string, ticketId: string) {
    const job = await this.assertAssigned(technicianId, ticketId); const mvTrackNumber = job.deployment?.mvTrackNumber;
    if (!mvTrackNumber) return [];
    const tickets = await this.prisma.ticket.findMany({ where: { deployment: { mvTrackNumber } }, select: { ticketNumber: true, issueDescription: true, closedAt: true, activities: { where: { activityType: `${ACTIVITY_PREFIX}REPAIR_NOTE_ADDED` }, orderBy: { performedAt: "desc" }, take: 1, select: { metadata: true, performedBy: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
    return tickets.map((item) => { const metadata = item.activities[0]?.metadata as { repairPerformed?: string } | null; return { ticketNumber: item.ticketNumber, repairDate: item.closedAt?.toISOString() ?? null, complaint: item.issueDescription, resolution: metadata?.repairPerformed ?? null, technician: item.activities[0]?.performedBy?.name ?? null, partsUsed: [] }; });
  }

  private async assertAssigned(technicianId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, assignedToId: technicianId }, select: { id: true, deployment: { select: { mvTrackNumber: true } } } });
    if (!ticket) throw new NotFoundError("Assigned technician job was not found."); return ticket;
  }

  private async currentMilestone(ticketId: string): Promise<TechnicianMilestone> {
    const latest = await this.prisma.ticketActivity.findFirst({ where: { ticketId, activityType: MILESTONE_ACTIVITY }, orderBy: { performedAt: "desc" }, select: { metadata: true } });
    const milestone = (latest?.metadata as { milestone?: string } | null)?.milestone;
    return MILESTONES.includes(milestone as TechnicianMilestone) ? milestone as TechnicianMilestone : "ASSIGNED";
  }

  private allowedNextMilestones(current: TechnicianMilestone): TechnicianMilestone[] {
    if (current === "READY_FOR_DELIVERY") return [];
    if (current === "REPAIR_STARTED") return ["WAITING_FOR_PARTS", "REPAIR_COMPLETED"];
    if (current === "WAITING_FOR_PARTS") return ["REPAIR_COMPLETED"];
    const next = MILESTONES[MILESTONES.indexOf(current) + 1];
    return next ? [next] : [];
  }

  private async assertCompletionChecklist(ticketId: string) {
    const [inspection, note] = await this.prisma.$transaction([
      this.prisma.ticketActivity.findFirst({ where: { ticketId, activityType: `${ACTIVITY_PREFIX}INSPECTION_RECORDED` }, select: { id: true } }),
      this.prisma.ticketActivity.findFirst({ where: { ticketId, activityType: `${ACTIVITY_PREFIX}REPAIR_NOTE_ADDED` }, select: { id: true } }),
    ]);
    if (!inspection || !note) throw new ValidationError("Complete the inspection and add a repair note before ready for delivery.");
  }

  private activity(ticketId: string, technicianId: string, activityType: string, description: string, remarks?: string, metadata?: Record<string, unknown>) {
    return this.prisma.ticketActivity.create({ data: { ticketId, performedById: technicianId, performedAt: new Date(), activityType, description, metadata: { ...(metadata ?? {}), remarks: remarks?.trim() || null } } });
  }
  private cleanInspection(input: TechnicianInspectionInputDto) { return { initialFindings: input.initialFindings.trim(), observations: input.observations?.trim() || null, rootCause: input.rootCause?.trim() || null, repairRecommendation: input.repairRecommendation?.trim() || null }; }
  private cleanNote(input: TechnicianRepairNoteInputDto) { return { findings: input.findings?.trim() || null, rootCause: input.rootCause?.trim() || null, repairPerformed: input.repairPerformed?.trim() || null, recommendations: input.recommendations?.trim() || null }; }
  private async toJob(job: Prisma.TicketGetPayload<{ select: typeof jobSelect }>): Promise<TechnicianJobDto> {
    const inventory = job.deployment?.mvTrackNumber ? await this.inventoryProvider.getVehicleDetails(job.deployment.mvTrackNumber) : null;
    return { id: job.id, ticketNumber: job.ticketNumber, mvTrackNumber: inventory?.mvTrackNumber ?? job.deployment?.mvTrackNumber ?? null, riderName: job.customer.name, vehicleModel: inventory?.modelName ?? null, registrationNumber: inventory?.registrationNumber ?? null, complaintSummary: job.issueDescription, priority: job.priority, assignedAt: job.createdAt.toISOString(), currentMilestone: await this.currentMilestone(job.id), slaDueAt: job.eta?.toISOString() ?? null, workflowStage: job.workflowStage, jobCardStage: job.jobCard?.workflowStage ?? null };
  }
}
