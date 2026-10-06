import type {
  NotificationChannelSettingDto,
  NotificationDashboardDto,
  NotificationDto,
  NotificationListResponseDto,
  NotificationMutationResponseDto,
  NotificationTemplateDto,
} from "../dto/notification.dto";
import type {
  NotificationChannelSettingRow,
  NotificationLogRow,
  NotificationTemplateRow,
} from "../repositories/notification.repository";

export class NotificationMapper {
  static toDashboard(input: NotificationDashboardDto): NotificationDashboardDto {
    return input;
  }

  static toNotification(row: NotificationLogRow): NotificationDto {
    return {
      notificationId: row.id,
      eventType: (row.eventType ?? "TICKET_CREATED") as NotificationDto["eventType"],
      sourceModule: (row.sourceModule ?? "TICKET") as NotificationDto["sourceModule"],
      sourceEntityId: row.sourceEntityId ?? "",
      channel: row.channel as NotificationDto["channel"],
      recipient: row.recipient ?? "",
      message: row.message,
      status: row.status as NotificationDto["status"],
      retryCount: row.attemptCount,
      lastError: row.errorMessage,
      templateId: row.templateId,
      read: row.readAt !== null,
      archived: row.archivedAt !== null,
      responseId: row.responseId,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toNotificationList(
    rows: NotificationLogRow[],
    totalRecords: number,
    page: number,
    pageSize: number
  ): NotificationListResponseDto {
    return {
      items: rows.map((row) => this.toNotification(row)),
      totalRecords,
      page,
      pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
    };
  }

  static toMutationResponse(notificationId: string, message: string, updatedAt: Date): NotificationMutationResponseDto {
    return {
      notificationId,
      status: "SUCCESS",
      message,
      updatedAt: updatedAt.toISOString(),
    };
  }

  static toTemplate(row: NotificationTemplateRow): NotificationTemplateDto {
    return {
      templateId: row.id,
      name: row.name,
      eventType: row.eventType as NotificationTemplateDto["eventType"],
      channel: row.channel as NotificationTemplateDto["channel"],
      subject: row.subject,
      content: row.content,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toTemplates(rows: NotificationTemplateRow[]): NotificationTemplateDto[] {
    return rows.map((row) => this.toTemplate(row));
  }

  static toSetting(row: NotificationChannelSettingRow): NotificationChannelSettingDto {
    return {
      settingId: row.id,
      channel: row.channel as NotificationChannelSettingDto["channel"],
      enabled: row.enabled,
      maxRetries: row.maxRetries,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toSettings(rows: NotificationChannelSettingRow[]): NotificationChannelSettingDto[] {
    return rows.map((row) => this.toSetting(row));
  }
}
