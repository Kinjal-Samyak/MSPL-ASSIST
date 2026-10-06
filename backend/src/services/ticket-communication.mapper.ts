import type {
  TicketAttachmentResponseDto,
  TicketCommentResponseDto,
  TicketCommentType,
  TicketNotificationResponseDto,
} from "../dto/ticket.dto";
import type {
  TicketAttachmentRecord,
  TicketCommentRecord,
  TicketNotificationRecord,
} from "../repositories/ticket.repository";

function readMetadataObject(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

function resolveCommentType(record: TicketCommentRecord): TicketCommentType {
  if (record.internal) {
    return "INTERNAL";
  }

  const metadata = readMetadataObject(record.activity?.metadata);
  const value = typeof metadata?.commentType === "string" ? metadata.commentType.toUpperCase() : "";
  if (value === "TECHNICIAN" || value === "CUSTOMER" || value === "SYSTEM") {
    return value;
  }

  return "CUSTOMER";
}

export class TicketCommunicationMapper {
  static toCommentResponse(record: TicketCommentRecord): TicketCommentResponseDto {
    const metadata = readMetadataObject(record.activity?.metadata);
    const metadataUserName = typeof metadata?.userName === "string" ? metadata.userName : null;
    const metadataUserRole = typeof metadata?.userRole === "string" ? metadata.userRole : null;

    return {
      id: record.id,
      ticketId: record.ticketId,
      commentType: resolveCommentType(record),
      text: record.comment,
      userName: record.createdBy?.name ?? metadataUserName,
      userRole: record.createdBy?.role ?? metadataUserRole,
      createdAt: record.createdAt.toISOString(),
    };
  }

  static toCommentListResponse(records: TicketCommentRecord[]): TicketCommentResponseDto[] {
    return records.map((record) => this.toCommentResponse(record));
  }

  static toAttachmentResponse(record: TicketAttachmentRecord): TicketAttachmentResponseDto {
    const metadata = readMetadataObject(record.activity?.metadata);
    const fileName = typeof metadata?.fileName === "string" ? metadata.fileName : record.fileUrl.split("/").pop();
    const fileSize = typeof metadata?.fileSize === "number" ? metadata.fileSize : 0;
    const uploadedBy = typeof metadata?.uploadedBy === "string" ? metadata.uploadedBy : "SYSTEM";
    const fileReference =
      typeof metadata?.fileReference === "string" ? metadata.fileReference : record.fileUrl;

    return {
      id: record.id,
      ticketId: record.ticketId,
      fileName: fileName ?? "unknown",
      fileType: record.fileType,
      fileSize,
      uploadedBy,
      uploadedAt: record.uploadedAt.toISOString(),
      fileReference,
    };
  }

  static toAttachmentListResponse(records: TicketAttachmentRecord[]): TicketAttachmentResponseDto[] {
    return records.map((record) => this.toAttachmentResponse(record));
  }

  static toNotificationListResponse(records: TicketNotificationRecord[]): TicketNotificationResponseDto[] {
    return records.map((record) => ({
      id: record.id,
      channel: record.channel,
      recipient: record.ticket.customer.registeredMobile,
      status: record.status,
      sentTime: record.sentAt ? record.sentAt.toISOString() : null,
      deliveryTime: record.status === "SENT" ? record.updatedAt.toISOString() : null,
    }));
  }
}
