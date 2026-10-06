import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  NotificationListQueryDto,
  NotificationSourceModule,
} from "../dto/notification.dto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateNotificationTemplateDto,
  SendNotificationDto,
  UpdateNotificationSettingsDto,
  UpdateNotificationTemplateDto,
} from "../dto/notification.dto";

export type NotificationLogRow = {
  id: string;
  templateId: string | null;
  eventType: string;
  sourceModule: string;
  sourceEntityId: string;
  channel: string;
  recipient: string;
  message: string;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  errorMessage: string | null;
  readAt: Date | null;
  archivedAt: Date | null;
  responseId: string | null;
  sentAt: Date | null;
  sentById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationTemplateRow = {
  id: string;
  name: string;
  eventType: string;
  channel: string;
  subject: string | null;
  content: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationChannelSettingRow = {
  id: string;
  channel: string;
  enabled: boolean;
  maxRetries: number;
  updatedAt: Date;
};

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboardCounts(): Promise<{
    totalNotifications: number;
    pendingNotifications: number;
    sentNotifications: number;
    failedNotifications: number;
    unreadNotifications: number;
    archivedNotifications: number;
    totalTemplates: number;
    activeChannels: number;
  }> {
    const [
      totalNotifications,
      pendingNotifications,
      sentNotifications,
      failedNotifications,
      unreadNotifications,
      archivedNotifications,
      totalTemplates,
      activeChannels,
    ] = await this.prisma.$transaction([
      this.prisma.notificationMessage.count(),
      this.prisma.notificationMessage.count({ where: { status: "NOT_SENT", archivedAt: null } }),
      this.prisma.notificationMessage.count({ where: { status: "SENT", archivedAt: null } }),
      this.prisma.notificationMessage.count({ where: { status: "FAILED", archivedAt: null } }),
      this.prisma.notificationMessage.count({ where: { readAt: null, archivedAt: null } }),
      this.prisma.notificationMessage.count({ where: { archivedAt: { not: null } } }),
      this.prisma.notificationTemplate.count(),
      this.prisma.notificationChannelSetting.count({ where: { enabled: true } }),
    ]);

    return {
      totalNotifications,
      pendingNotifications,
      sentNotifications,
      failedNotifications,
      unreadNotifications,
      archivedNotifications,
      totalTemplates,
      activeChannels,
    };
  }

  async listNotifications(query: NotificationListQueryDto): Promise<{ items: NotificationLogRow[]; totalRecords: number }> {
    const where: Prisma.NotificationMessageWhereInput = {
      ...(query.search
        ? {
            OR: [
              { recipient: { contains: query.search, mode: "insensitive" } },
              { message: { contains: query.search, mode: "insensitive" } },
              { sourceEntityId: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.archived === undefined
        ? {}
        : query.archived
          ? { archivedAt: { not: null } }
          : { archivedAt: null }),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.notificationMessage.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.toOrderBy(query.sortBy, query.sortOrder),
      }),
      this.prisma.notificationMessage.count({ where }),
    ]);

    return { items: items as NotificationLogRow[], totalRecords };
  }

  async findNotificationById(notificationId: string): Promise<NotificationLogRow | null> {
    const row = await this.prisma.notificationMessage.findUnique({
      where: { id: notificationId },
    });
    return row as NotificationLogRow | null;
  }

  async createNotificationLog(payload: {
    templateId?: string;
    eventType: NotificationEventType;
    sourceModule: NotificationSourceModule;
    sourceEntityId: string;
    channel: NotificationChannel;
    recipient: string;
    message: string;
    status: NotificationDeliveryStatus;
    attemptCount: number;
    errorMessage?: string;
    responseId?: string;
    sentAt?: Date;
    sentById?: string;
  }): Promise<NotificationLogRow> {
    const row = await this.prisma.notificationMessage.create({
      data: {
        templateId: payload.templateId,
        eventType: payload.eventType,
        sourceModule: payload.sourceModule,
        sourceEntityId: payload.sourceEntityId,
        channel: payload.channel,
        recipient: payload.recipient,
        message: payload.message,
        status: payload.status,
        attemptCount: payload.attemptCount,
        errorMessage: payload.errorMessage,
        responseId: payload.responseId,
        sentAt: payload.sentAt,
        sentById: payload.sentById,
      },
    });
    return row as NotificationLogRow;
  }

  async markNotificationRead(notificationId: string): Promise<NotificationLogRow> {
    const row = await this.prisma.notificationMessage.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return row as NotificationLogRow;
  }

  async archiveNotification(notificationId: string): Promise<NotificationLogRow> {
    const row = await this.prisma.notificationMessage.update({
      where: { id: notificationId },
      data: { archivedAt: new Date() },
    });
    return row as NotificationLogRow;
  }

  async listTemplates(): Promise<NotificationTemplateRow[]> {
    const rows = await this.prisma.notificationTemplate.findMany({
      orderBy: [{ eventType: "asc" }, { channel: "asc" }, { name: "asc" }],
    });
    return rows as NotificationTemplateRow[];
  }

  async findTemplateById(templateId: string): Promise<NotificationTemplateRow | null> {
    const row = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });
    return row as NotificationTemplateRow | null;
  }

  async createTemplate(payload: CreateNotificationTemplateDto): Promise<NotificationTemplateRow> {
    const row = await this.prisma.notificationTemplate.create({
      data: {
        name: payload.name,
        eventType: payload.eventType,
        channel: payload.channel,
        subject: payload.subject ?? null,
        content: payload.content,
        active: payload.active ?? true,
      },
    });
    return row as NotificationTemplateRow;
  }

  async updateTemplate(templateId: string, payload: UpdateNotificationTemplateDto): Promise<NotificationTemplateRow> {
    const row = await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...(payload.name === undefined ? {} : { name: payload.name }),
        ...(payload.channel === undefined ? {} : { channel: payload.channel }),
        ...(payload.subject === undefined ? {} : { subject: payload.subject }),
        ...(payload.content === undefined ? {} : { content: payload.content }),
        ...(payload.active === undefined ? {} : { active: payload.active }),
      },
    });
    return row as NotificationTemplateRow;
  }

  async listSettings(): Promise<NotificationChannelSettingRow[]> {
    const rows = await this.prisma.notificationChannelSetting.findMany({
      orderBy: { channel: "asc" },
    });
    return rows as NotificationChannelSettingRow[];
  }

  async upsertSettings(payload: UpdateNotificationSettingsDto): Promise<NotificationChannelSettingRow[]> {
    await this.prisma.$transaction(
      payload.settings.map((setting) =>
        this.prisma.notificationChannelSetting.upsert({
          where: { channel: setting.channel },
          create: {
            channel: setting.channel,
            enabled: setting.enabled,
            maxRetries: setting.maxRetries,
          },
          update: {
            enabled: setting.enabled,
            maxRetries: setting.maxRetries,
          },
        })
      )
    );
    return this.listSettings();
  }

  async getSettingByChannel(channel: NotificationChannel): Promise<NotificationChannelSettingRow | null> {
    const row = await this.prisma.notificationChannelSetting.findUnique({
      where: { channel },
    });
    return row as NotificationChannelSettingRow | null;
  }

  async sourceRecordExists(sourceModule: NotificationSourceModule, sourceEntityId: string): Promise<boolean> {
    switch (sourceModule) {
      case "TICKET":
      case "WORKSHOP": {
        const count = await this.prisma.ticket.count({ where: { id: sourceEntityId } });
        return count > 0;
      }
      case "CUSTOMER": {
        const count = await this.prisma.customer.count({ where: { id: sourceEntityId } });
        return count > 0;
      }
      case "DEPLOYMENT": {
        const count = await this.prisma.deployment.count({ where: { id: sourceEntityId } });
        return count > 0;
      }
      case "ADMIN": {
        const count = await this.prisma.user.count({ where: { id: sourceEntityId } });
        return count > 0;
      }
      case "VEHICLE": {
        const [deploymentCount, modelCount] = await this.prisma.$transaction([
          this.prisma.deployment.count({ where: { id: sourceEntityId } }),
          this.prisma.vehicleModel.count({ where: { id: sourceEntityId } }),
        ]);
        return deploymentCount > 0 || modelCount > 0;
      }
      default:
        return false;
    }
  }

  private toOrderBy(
    sortBy: NotificationListQueryDto["sortBy"],
    sortOrder: NotificationListQueryDto["sortOrder"]
  ): Prisma.NotificationMessageOrderByWithRelationInput {
    switch (sortBy) {
      case "updatedAt":
        return { updatedAt: sortOrder };
      case "channel":
        return { channel: sortOrder };
      case "status":
        return { status: sortOrder };
      case "eventType":
        return { eventType: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }
}
