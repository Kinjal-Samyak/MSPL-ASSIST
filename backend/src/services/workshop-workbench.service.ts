import { prismaClient } from "../database";
import {
  WorkshopWorkbenchRepository,
  type WorkshopWorkbenchJobCardRow,
} from "../repositories/workshop-workbench.repository";
import { validateWorkshopWorkbenchListQuery } from "../validators/workshop-workbench.validator";
import type {
  WorkshopWorkbenchJobCardListItemDto,
  WorkshopWorkbenchListResponseDto,
  WorkshopWorkbenchSummaryDto,
} from "../dto/workshop-workbench.dto";
import { computeJobCardEffectiveStatus, JOB_CARD_STATUS_LABELS } from "../utils/job-card-status";
import { computeTicketEffectiveStatus } from "../utils/ticket-status";

export class WorkshopWorkbenchService {
  private readonly repository: WorkshopWorkbenchRepository;

  constructor(repository?: WorkshopWorkbenchRepository) {
    this.repository = repository ?? new WorkshopWorkbenchRepository(prismaClient);
  }

  async getSummary(): Promise<WorkshopWorkbenchSummaryDto> {
    return this.repository.getSummary();
  }

  async listJobCards(input: unknown): Promise<WorkshopWorkbenchListResponseDto> {
    const query = validateWorkshopWorkbenchListQuery(input);
    const { items, totalRecords } = await this.repository.list(query);

    return {
      items: items.map(WorkshopWorkbenchService.toListItemDto),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private static toListItemDto(row: WorkshopWorkbenchJobCardRow): WorkshopWorkbenchJobCardListItemDto {
    const status = computeJobCardEffectiveStatus(row.workflowStage, row.lastEditedAt);
    const ticketStatus = computeTicketEffectiveStatus({
      status: row.ticket.status,
      workflowStage: row.ticket.workflowStage,
      jobCard: { workflowStage: row.workflowStage, lastEditedAt: row.lastEditedAt },
    });

    return {
      jobCardId: row.id,
      jobCardNumber: row.jobCardNumber,
      ticketId: row.ticket.id,
      ticketNumber: row.ticket.ticketNumber,
      riderName: row.ticket.customer.name,
      mobileNumber: row.ticket.customer.registeredMobile,
      vehicle: row.ticket.deployment
        ? `${row.ticket.deployment.vehicleModel.displayName} · ${row.ticket.deployment.vehicleNumber}`
        : null,
      hub: row.ticket.deployment?.hub.name ?? null,
      technicianId: row.technicianId,
      technicianName: row.technician.name,
      status,
      statusLabel: JOB_CARD_STATUS_LABELS[status],
      ticketStatus,
      priority: row.ticket.priority,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
