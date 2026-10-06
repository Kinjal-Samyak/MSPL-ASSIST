import { NotFoundError, UnprocessableEntityError, ValidationError } from "../errors";
import { prismaClient } from "../database";
import { TicketNumberService } from "./ticket-number.service";
import {
  validateAssignWorkshopJobDto,
  validateCreateWorkshopJobDto,
  validateUpdateWorkshopJobDto,
  validateWorkshopJobIdParam,
  validateWorkshopJobListQuery,
  validateWorkshopTimelineQuery,
} from "../validators/workshop.validator";
import type {
  WorkshopAttachmentsResponseDto,
  WorkshopDashboardDto,
  WorkshopJobDetailDto,
  WorkshopJobListResponseDto,
  WorkshopMutationResponseDto,
  WorkshopPartsResponseDto,
  WorkshopTimelineResponseDto,
} from "../dto/workshop.dto";
import { WorkshopRepository } from "../repositories/workshop.repository";
import type { OperationalProvidersRegistry } from "./operational-providers";
import { OperationalProviders } from "./operational-providers";
import { WorkshopMapper } from "./workshop.mapper";

const STATUS_OPEN = "Open";
const STATUS_ASSIGNED = "Assigned";
const STATUS_IN_PROGRESS = "In Progress";
const STATUS_COMPLETED = "Completed";
const STATUS_CANCELLED = "Cancelled";

export class WorkshopService {
  private readonly repository: WorkshopRepository;
  private readonly ticketNumberService: TicketNumberService;

  constructor(
    private readonly providers: OperationalProvidersRegistry = OperationalProviders,
    repository?: WorkshopRepository
  ) {
    this.repository = repository ?? new WorkshopRepository(prismaClient);
    this.ticketNumberService = new TicketNumberService(prismaClient);
  }

  async getDashboard(): Promise<WorkshopDashboardDto> {
    const [totalJobs, openJobs, assignedJobs, inProgressJobs, completedJobs, cancelledJobs] = await Promise.all([
      this.repository.countJobs(),
      this.repository.countJobsByStatus(STATUS_OPEN),
      this.repository.countJobsByStatus(STATUS_ASSIGNED),
      this.repository.countJobsByStatus(STATUS_IN_PROGRESS),
      this.repository.countJobsByStatus(STATUS_COMPLETED),
      this.repository.countJobsByStatus(STATUS_CANCELLED),
    ]);
    return WorkshopMapper.toDashboard(
      totalJobs,
      openJobs,
      assignedJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs
    );
  }

  async getJobs(input: unknown): Promise<WorkshopJobListResponseDto> {
    const query = validateWorkshopJobListQuery(input);
    const { items, totalRecords } = await this.repository.listJobs(query);
    const mapped = await Promise.all(
      items.map(async (item) => {
        const vehicle = await this.providers.inventoryProvider.getVehicleDetails(item.mvTrackNumber);
        return WorkshopMapper.toJobListItem(item, vehicle?.status ?? null);
      })
    );
    return WorkshopMapper.toJobListResponse(mapped, totalRecords, query.page, query.pageSize);
  }

  async searchJobs(input: unknown): Promise<WorkshopJobListResponseDto> {
    return this.getJobs(input);
  }

  async getJobById(jobIdInput: unknown): Promise<WorkshopJobDetailDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    const job = await this.getJobOrThrow(jobId);

    await this.assertDeploymentFromProvider(job.customerId, job.deploymentId);

    const vehicle = await this.providers.inventoryProvider.getVehicleDetails(job.mvTrackNumber);
    const listItem = WorkshopMapper.toJobListItem(job, vehicle?.status ?? null);
    const openTicketCount = await this.repository.countJobsByStatus(STATUS_OPEN);
    return WorkshopMapper.toJobDetail(
      listItem,
      job,
      openTicketCount,
      vehicle?.vin ?? null,
      vehicle?.batteryNumber ?? null,
      vehicle?.registrationNumber ?? null
    );
  }

  async createJob(input: unknown): Promise<WorkshopMutationResponseDto> {
    const payload = validateCreateWorkshopJobDto(input);
    const deployment = await this.repository.findDeploymentById(payload.deploymentId);
    if (!deployment) {
      throw new NotFoundError(`Deployment with id ${payload.deploymentId} was not found.`);
    }

    await this.assertDeploymentFromProvider(deployment.customerId, payload.deploymentId);

    const issueCategory = await this.repository.findIssueCategoryById(payload.issueCategoryId);
    if (!issueCategory) {
      throw new NotFoundError(`Issue category with id ${payload.issueCategoryId} was not found.`);
    }

    const openStatusId = await this.repository.findStatusIdByName(STATUS_OPEN);
    if (!openStatusId) {
      throw new ValidationError(`Status ${STATUS_OPEN} was not found.`);
    }

    const activeJob = typeof (this.repository as any).findActiveWorkshopJobByDeployment === "function"
      ? await (this.repository as any).findActiveWorkshopJobByDeployment(payload.deploymentId)
      : null;
    if (activeJob) {
      if (this.equalsStatus(activeJob.status, STATUS_IN_PROGRESS)) {
        throw new UnprocessableEntityError("Issue categories cannot be added after Work In Progress has started.");
      }
      await (this.repository as any).appendIssueCategory(
        activeJob.id,
        payload.issueCategoryId,
        payload.issueDescription
      );
      await this.repository.addActivity(
        activeJob.id,
        "WORKSHOP_ISSUE_APPENDED",
        "Issue category appended to the active workshop ticket."
      );
      return WorkshopMapper.toMutationResponse(activeJob);
    }

    const created = await prismaClient.$transaction(async (tx) => {
      const ticketNumber = await this.ticketNumberService.generateNextTicketNumber(tx);
      const repository = new WorkshopRepository(tx);
      return repository.createJob({
        ...payload,
        customerId: deployment.customerId,
        ticketNumber: ticketNumber.ticketNumber,
        statusId: openStatusId,
      });
    });

    return WorkshopMapper.toMutationResponse(created);
  }

  async updateJob(jobIdInput: unknown, input: unknown): Promise<WorkshopMutationResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    const payload = validateUpdateWorkshopJobDto(input);
    const job = await this.getJobOrThrow(jobId);
    this.assertEditable(job.status);

    const updated = await this.repository.updateJob(jobId, payload);
    await this.repository.addActivity(jobId, "WORKSHOP_JOB_UPDATED", "Workshop job details were updated.");
    return WorkshopMapper.toMutationResponse(updated);
  }

  async assignJob(jobIdInput: unknown, input: unknown): Promise<WorkshopMutationResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    const payload = validateAssignWorkshopJobDto(input);
    const job = await this.getJobOrThrow(jobId);
    this.assertEditable(job.status);

    const technicians = await this.providers.lookupProvider.getTechnicians({});
    const technician = technicians.find((item) => item.technicianId === payload.technicianId);
    if (!technician) {
      throw new NotFoundError(`Technician with id ${payload.technicianId} was not found.`);
    }

    const assigned = await this.repository.assignJob(jobId, payload);
    await this.repository.addActivity(
      jobId,
      "WORKSHOP_JOB_ASSIGNED",
      payload.assignmentNotes ? payload.assignmentNotes : "Workshop job assigned."
    );
    return WorkshopMapper.toMutationResponse(assigned);
  }

  async startJob(jobIdInput: unknown): Promise<WorkshopMutationResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    const job = await this.getJobOrThrow(jobId);
    if (this.equalsStatus(job.status, STATUS_CANCELLED)) {
      throw new UnprocessableEntityError("Cancelled jobs cannot be restarted.");
    }
    if (this.equalsStatus(job.status, STATUS_COMPLETED)) {
      throw new UnprocessableEntityError("Completed jobs cannot be restarted.");
    }

    const inProgressStatusId = await this.repository.findStatusIdByName(STATUS_IN_PROGRESS);
    if (!inProgressStatusId) {
      throw new ValidationError(`Status ${STATUS_IN_PROGRESS} was not found.`);
    }

    const updated = await this.repository.updateJobStatus(jobId, inProgressStatusId);
    await this.repository.addActivity(jobId, "WORKSHOP_JOB_STARTED", "Workshop job started.");
    return WorkshopMapper.toMutationResponse(updated);
  }

  async completeJob(jobIdInput: unknown): Promise<WorkshopMutationResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    const job = await this.getJobOrThrow(jobId);
    if (this.equalsStatus(job.status, STATUS_CANCELLED)) {
      throw new UnprocessableEntityError("Cancelled jobs cannot be completed.");
    }

    const completedStatusId = await this.repository.findStatusIdByName(STATUS_COMPLETED);
    if (!completedStatusId) {
      throw new ValidationError(`Status ${STATUS_COMPLETED} was not found.`);
    }

    const updated = await this.repository.updateJobStatus(jobId, completedStatusId);
    await this.repository.addActivity(jobId, "WORKSHOP_JOB_COMPLETED", "Workshop job completed.");
    return WorkshopMapper.toMutationResponse(updated);
  }

  async cancelJob(jobIdInput: unknown): Promise<WorkshopMutationResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    const job = await this.getJobOrThrow(jobId);
    if (this.equalsStatus(job.status, STATUS_COMPLETED)) {
      throw new UnprocessableEntityError("Completed jobs cannot be cancelled.");
    }

    const cancelledStatusId = await this.repository.findStatusIdByName(STATUS_CANCELLED);
    if (!cancelledStatusId) {
      throw new ValidationError(`Status ${STATUS_CANCELLED} was not found.`);
    }

    const updated = await this.repository.updateJobStatus(jobId, cancelledStatusId);
    await this.repository.addActivity(jobId, "WORKSHOP_JOB_CANCELLED", "Workshop job cancelled.");
    return WorkshopMapper.toMutationResponse(updated);
  }

  async getTimeline(jobIdInput: unknown, input: unknown): Promise<WorkshopTimelineResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    await this.getJobOrThrow(jobId);
    const query = validateWorkshopTimelineQuery(input);
    const { items, totalRecords } = await this.repository.getTimeline(jobId, query.page, query.pageSize);
    return WorkshopMapper.toTimelineResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getParts(jobIdInput: unknown, input: unknown): Promise<WorkshopPartsResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    await this.getJobOrThrow(jobId);
    const query = validateWorkshopTimelineQuery(input);
    const { items, totalRecords } = await this.repository.getParts(jobId, query.page, query.pageSize);
    return WorkshopMapper.toPartsResponse(items, totalRecords, query.page, query.pageSize);
  }

  async getAttachments(jobIdInput: unknown, input: unknown): Promise<WorkshopAttachmentsResponseDto> {
    const jobId = validateWorkshopJobIdParam(jobIdInput);
    await this.getJobOrThrow(jobId);
    const query = validateWorkshopTimelineQuery(input);
    const { items, totalRecords } = await this.repository.getAttachments(jobId, query.page, query.pageSize);
    return WorkshopMapper.toAttachmentsResponse(items, totalRecords, query.page, query.pageSize);
  }

  private async getJobOrThrow(jobId: string) {
    const job = await this.repository.findJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Workshop job with id ${jobId} was not found.`);
    }
    return job;
  }

  private assertEditable(status: string): void {
    if (this.equalsStatus(status, STATUS_COMPLETED)) {
      throw new UnprocessableEntityError("Completed jobs cannot be edited.");
    }
    if (this.equalsStatus(status, STATUS_CANCELLED)) {
      throw new UnprocessableEntityError("Cancelled jobs cannot be edited.");
    }
  }

  private equalsStatus(value: string, expected: string): boolean {
    return value.trim().toLowerCase() === expected.toLowerCase();
  }

  private async assertDeploymentFromProvider(customerId: string, deploymentId: string): Promise<void> {
    const history = await this.providers.deploymentProvider.getDeploymentHistory(customerId);
    const matched = history.find((item) => item.deploymentId === deploymentId);
    if (!matched) {
      throw new NotFoundError(`Deployment with id ${deploymentId} was not found in operational provider.`);
    }
  }
}
