import { prismaClient } from "../database";
import type {
  ActivityTimelineListResponseDto,
  OpsAdminMutationResponseDto,
  OpsAdminTicketListResponseDto,
  OpsAdminTicketRowDto,
} from "../dto/ops-admin.dto";
import { NotFoundError, ValidationError } from "../errors";
import type { OpsAdminTicketRow } from "../repositories/ops-admin.repository";
import { OpsAdminRepository } from "../repositories/ops-admin.repository";
import {
  validateActivityTimelineQuery,
  validateDeleteTicketWithReasonDto,
  validateForceCloseTicketDto,
  validateOpsAdminTicketSearchQuery,
  validateReassignTicketDto,
} from "../validators/ops-admin.validator";
import { AuditLogService } from "./audit-log.service";
import type { AdminActorContext } from "./admin.service";

function toRowDto(row: OpsAdminTicketRow): OpsAdminTicketRowDto {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    customerName: row.customer.name,
    mobileNumber: row.customer.registeredMobile,
    status: row.status.name,
    workflowStage: row.workflowStage,
    priority: row.priority,
    technician: row.assignedTo?.name ?? null,
    serviceTl: row.serviceTl?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    deleteReason: row.deleteReason,
    deletedByName: row.deletedByName,
  };
}

export class OpsAdminService {
  private readonly repository: OpsAdminRepository;
  private readonly auditLog: AuditLogService;

  constructor(repository?: OpsAdminRepository, auditLog?: AuditLogService) {
    this.repository = repository ?? new OpsAdminRepository(prismaClient);
    this.auditLog = auditLog ?? new AuditLogService();
  }

  async searchTickets(queryInput: unknown): Promise<OpsAdminTicketListResponseDto> {
    const query = validateOpsAdminTicketSearchQuery(queryInput);
    const { items, totalRecords } = await this.repository.searchTickets(query);
    return {
      items: items.map(toRowDto),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.pageSize),
    };
  }

  async deleteTicket(ticketIdInput: unknown, payloadInput: unknown, actor?: AdminActorContext): Promise<OpsAdminMutationResponseDto> {
    const ticketId = this.requireTicketId(ticketIdInput);
    const payload = validateDeleteTicketWithReasonDto(payloadInput);
    await this.assertTicketExists(ticketId);

    const updated = await this.repository.softDeleteTicket(ticketId, payload.reason, actor?.name ?? "Administrator", actor?.userId);
    await this.audit(ticketId, "TICKET_SOFT_DELETED", actor, payload.reason);
    return this.toMutationResponse(updated, "Ticket deleted successfully.");
  }

  async restoreTicket(ticketIdInput: unknown, actor?: AdminActorContext): Promise<OpsAdminMutationResponseDto> {
    const ticketId = this.requireTicketId(ticketIdInput);
    await this.assertTicketExists(ticketId);

    const updated = await this.repository.restoreTicket(ticketId, actor?.userId);
    await this.audit(ticketId, "TICKET_RESTORED", actor);
    return this.toMutationResponse(updated, "Ticket restored successfully.");
  }

  async forceCloseTicket(ticketIdInput: unknown, payloadInput: unknown, actor?: AdminActorContext): Promise<OpsAdminMutationResponseDto> {
    const ticketId = this.requireTicketId(ticketIdInput);
    const payload = validateForceCloseTicketDto(payloadInput);
    await this.assertTicketExists(ticketId);

    const updated = await this.repository.forceCloseTicket(ticketId, payload.reason, actor?.userId);
    await this.audit(ticketId, "TICKET_FORCE_CLOSED", actor, payload.reason);
    return this.toMutationResponse(updated, "Ticket force-closed successfully.");
  }

  async reassignTicket(ticketIdInput: unknown, payloadInput: unknown, actor?: AdminActorContext): Promise<OpsAdminMutationResponseDto> {
    const ticketId = this.requireTicketId(ticketIdInput);
    const payload = validateReassignTicketDto(payloadInput);
    await this.assertTicketExists(ticketId);

    const updated = await this.repository.reassignTicket(ticketId, payload, actor?.userId);
    await this.audit(ticketId, "TICKET_REASSIGNED", actor, undefined, {
      serviceTlId: payload.serviceTlId ?? null,
      technicianId: payload.technicianId ?? null,
    });
    return this.toMutationResponse(updated, "Ticket reassigned successfully.");
  }

  async searchActivityTimeline(queryInput: unknown): Promise<ActivityTimelineListResponseDto> {
    const query = validateActivityTimelineQuery(queryInput);
    const { items, totalRecords } = await this.repository.searchActivityTimeline(query);
    return {
      items: items.map((row) => ({
        id: row.id,
        ticketId: row.ticketId,
        ticketNumber: row.ticket.ticketNumber,
        activityType: row.activityType,
        description: row.description,
        performedByName: row.performedBy?.name ?? null,
        performedAt: row.performedAt.toISOString(),
        metadata: row.metadata,
      })),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.pageSize),
    };
  }

  private requireTicketId(input: unknown): string {
    if (typeof input !== "string" || !input.trim()) {
      throw new ValidationError("ticketId is required.");
    }
    return input;
  }

  private async assertTicketExists(ticketId: string): Promise<void> {
    const ticket = await this.repository.findTicketForOps(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with id ${ticketId} was not found.`);
    }
  }

  private toMutationResponse(row: OpsAdminTicketRow, message: string): OpsAdminMutationResponseDto {
    return {
      ticketId: row.id,
      status: "SUCCESS",
      message,
      updatedAt: new Date().toISOString(),
    };
  }

  private async audit(
    ticketId: string,
    action: string,
    actor: AdminActorContext | undefined,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.auditLog.record({
      entityType: "Ticket",
      entityId: ticketId,
      action,
      performedById: actor?.userId ?? null,
      performedByName: actor?.name ?? null,
      performedByRole: actor?.role ?? null,
      reason: reason ?? null,
      metadata: metadata ?? null,
    });
  }
}
