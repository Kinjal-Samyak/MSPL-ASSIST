import type {
  TicketAssignmentResponseDto,
  TicketChargesResponseDto,
  TicketEtaResponseDto,
  TicketStatusResponseDto,
  UpdateTicketChargesDto,
} from "../dto/ticket.dto";
import type {
  TechnicianRecord,
  TicketAssignmentRecord,
  TicketChargesUpdateRecord,
  TicketEtaUpdateRecord,
  TicketStatusUpdateRecord,
} from "../repositories/ticket.repository";

function readMetadataObject(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

export class TicketOperationsMapper {
  static toAssignmentResponse(
    record: TicketAssignmentRecord,
    technician: TechnicianRecord
  ): TicketAssignmentResponseDto {
    const metadata = readMetadataObject(record.activity.metadata);

    return {
      ticketId: record.id,
      technicianId: record.assignedTo?.id ?? technician.id,
      technicianName: record.assignedTo?.name ?? technician.name,
      assignmentNotes: typeof metadata?.assignmentNotes === "string" ? metadata.assignmentNotes : null,
      assignedAt: record.activity.performedAt.toISOString(),
    };
  }

  static toStatusResponse(
    record: TicketStatusUpdateRecord,
    oldStatus: string,
    remarks?: string
  ): TicketStatusResponseDto {
    return {
      ticketId: record.id,
      oldStatus,
      newStatus: record.status.name,
      updatedAt: record.updatedAt.toISOString(),
      remarks: remarks ?? null,
    };
  }

  static toEtaResponse(
    record: TicketEtaUpdateRecord,
    previousEta: Date | null,
    reason: string
  ): TicketEtaResponseDto {
    return {
      ticketId: record.id,
      previousEta: previousEta ? previousEta.toISOString() : null,
      newEta: record.eta ? record.eta.toISOString() : "",
      reason,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  static toChargesResponse(
    record: TicketChargesUpdateRecord,
    payload: UpdateTicketChargesDto
  ): TicketChargesResponseDto {
    return {
      ticketId: record.id,
      labourCharges: payload.labourCharges,
      partsCharges: payload.partsCharges,
      discount: payload.discount,
      totalCharges: payload.totalCharges,
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
