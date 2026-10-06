import { ConflictError, NotFoundError, UnprocessableEntityError } from "../errors";
import { prismaClient } from "../database";
import type {
  CreateNotificationTemplateDto,
  NotificationChannel,
  NotificationChannelSettingDto,
  NotificationDashboardDto,
  NotificationDto,
  NotificationEventType,
  NotificationListResponseDto,
  NotificationMutationResponseDto,
  NotificationTemplateDto,
  SendNotificationDto,
  UpdateNotificationSettingsDto,
  UpdateNotificationTemplateDto,
} from "../dto/notification.dto";
import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationMapper } from "./notification.mapper";
import { runtimeEnvironment, type RuntimeEnvironment } from "../config/runtime-environment";
import { logger } from "../utils/logger";
import {
  validateCreateNotificationTemplateDto,
  validateNotificationIdParam,
  validateNotificationListQuery,
  validateSendNotificationDto,
  validateTemplateIdParam,
  validateUpdateNotificationSettingsDto,
  validateUpdateNotificationTemplateDto,
} from "../validators/notification.validator";

type AdapterResult = {
  status: "SENT" | "FAILED";
  responseId?: string;
  errorMessage?: string;
};

interface NotificationChannelAdapter {
  send(input: {
    recipient: string;
    subject?: string;
    message: string;
    eventType: NotificationEventType;
    sourceEntityId: string;
  }): Promise<AdapterResult>;
}

class SimulatedChannelAdapter implements NotificationChannelAdapter {
  constructor(private readonly channel: NotificationChannel) {}

  async send(input: {
    recipient: string;
    subject?: string;
    message: string;
    eventType: NotificationEventType;
    sourceEntityId: string;
  }): Promise<AdapterResult> {
    if (input.recipient.toLowerCase().includes("fail")) {
      return {
        status: "FAILED",
        errorMessage: `${this.channel} simulated delivery failure.`,
      };
    }

    return {
      status: "SENT",
      responseId: `${this.channel}-${Date.now()}-${input.sourceEntityId}`,
    };
  }
}

const DEFAULT_SETTINGS: Array<{ channel: NotificationChannel; enabled: boolean; maxRetries: number }> = [
  { channel: "WHATSAPP", enabled: true, maxRetries: 3 },
  { channel: "SMS", enabled: true, maxRetries: 3 },
  { channel: "EMAIL", enabled: true, maxRetries: 3 },
  { channel: "IN_APP", enabled: true, maxRetries: 3 },
];

const EVENT_SOURCE_MAP: Record<NotificationEventType, SendNotificationDto["sourceModule"]> = {
  TICKET_CREATED: "TICKET",
  TICKET_ASSIGNED: "TICKET",
  TICKET_CLOSED: "TICKET",
  TICKET_STATUS_UPDATED: "TICKET",
  TICKET_ETA_UPDATED: "TICKET",
  TICKET_CHARGES_UPDATED: "TICKET",
  WORKSHOP_ASSIGNED: "WORKSHOP",
  WORKSHOP_COMPLETED: "WORKSHOP",
  DEPLOYMENT_STARTED: "DEPLOYMENT",
  DEPLOYMENT_CLOSED: "DEPLOYMENT",
  CUSTOMER_CREATED: "CUSTOMER",
  VEHICLE_ACTIVATED: "VEHICLE",
  VEHICLE_DEACTIVATED: "VEHICLE",
  USER_CREATED: "ADMIN",
  USER_UPDATED: "ADMIN",
  REPAIR_STARTED: "TICKET",
  WAITING_FOR_PARTS: "TICKET",
  WORK_COMPLETED: "TICKET",
  READY_FOR_DELIVERY: "TICKET",
  TICKET_CANCELLED: "TICKET",
  GENERAL_ANNOUNCEMENT: "TICKET",
  VEHICLE_PENDING_PICKUP_REMINDER: "TICKET",
};

export class NotificationService {
  private readonly repository: NotificationRepository;
  private readonly adapters: Record<NotificationChannel, NotificationChannelAdapter>;

  constructor(repository?: NotificationRepository, private readonly environment: RuntimeEnvironment = runtimeEnvironment) {
    this.repository = repository ?? new NotificationRepository(prismaClient);
    this.adapters = {
      WHATSAPP: new SimulatedChannelAdapter("WHATSAPP"),
      SMS: new SimulatedChannelAdapter("SMS"),
      EMAIL: new SimulatedChannelAdapter("EMAIL"),
      IN_APP: new SimulatedChannelAdapter("IN_APP"),
    };
  }

  async getDashboard(): Promise<NotificationDashboardDto> {
    const counts = await this.repository.getDashboardCounts();
    return NotificationMapper.toDashboard(counts);
  }

  async getNotifications(queryInput: unknown): Promise<NotificationListResponseDto> {
    const query = validateNotificationListQuery(queryInput);
    const { items, totalRecords } = await this.repository.listNotifications(query);
    return NotificationMapper.toNotificationList(items, totalRecords, query.page, query.pageSize);
  }

  async getNotificationById(notificationIdInput: unknown): Promise<NotificationDto> {
    const notificationId = validateNotificationIdParam(notificationIdInput);
    const row = await this.repository.findNotificationById(notificationId);
    if (!row) {
      throw new NotFoundError(`Notification with id ${notificationId} was not found.`);
    }
    return NotificationMapper.toNotification(row);
  }

  async sendNotification(payloadInput: unknown): Promise<NotificationMutationResponseDto> {
    const payload = validateSendNotificationDto(payloadInput);
    if (EVENT_SOURCE_MAP[payload.eventType] !== payload.sourceModule) {
      throw new UnprocessableEntityError(
        `${payload.eventType} is not valid for source module ${payload.sourceModule}.`
      );
    }

    const sourceExists = await this.repository.sourceRecordExists(payload.sourceModule, payload.sourceEntityId);
    if (!sourceExists) {
      throw new NotFoundError(
        `${payload.sourceModule} record with id ${payload.sourceEntityId} was not found.`
      );
    }

    const settings = await this.getResolvedSettings();
    const channelSetting = settings.find((setting) => setting.channel === payload.channel);
    if (!channelSetting || !channelSetting.enabled) {
      throw new UnprocessableEntityError(`${payload.channel} channel is disabled.`);
    }

    let message = payload.message ?? "";
    let templateId: string | undefined;
    let subject: string | undefined;
    if (payload.templateId) {
      const template = await this.repository.findTemplateById(payload.templateId);
      if (!template || !template.active) {
        throw new NotFoundError(`Template with id ${payload.templateId} was not found.`);
      }
      if (template.eventType !== payload.eventType || template.channel !== payload.channel) {
        throw new UnprocessableEntityError("Template event type/channel does not match notification payload.");
      }
      message = this.renderTemplate(template.content, payload.variables);
      subject = template.subject ?? undefined;
      templateId = template.id;
    }

    /**
     * Training normally suppresses all external delivery. An explicit, admin-configured
     * allowlist (TRAINING_TEST_RECIPIENTS) lets UAT verify real delivery end-to-end for a
     * handful of known-safe recipients without risking notifications reaching real customers.
     */
    const isAllowlistedTrainingTestRecipient = this.environment.trainingTestRecipients.includes(
      payload.recipient.trim().toLowerCase()
    );

    if (this.environment.isTraining && !isAllowlistedTrainingTestRecipient) {
      const created = await this.repository.createNotificationLog({
        templateId,
        eventType: payload.eventType,
        sourceModule: payload.sourceModule,
        sourceEntityId: payload.sourceEntityId,
        channel: payload.channel,
        recipient: payload.recipient,
        message,
        status: "NOT_SENT",
        attemptCount: 0,
        errorMessage: "SUPPRESSED: Training environment. No external delivery was attempted.",
        responseId: "training-suppressed",
        sentById: payload.sentById,
      });
      logger.info({
        scope: "notification",
        event: "External Delivery Suppressed",
        runtimeEnvironment: this.environment.name,
        channel: payload.channel,
        notificationId: created.id,
      });
      return NotificationMapper.toMutationResponse(
        created.id,
        "Notification suppressed in Training environment; no external delivery was attempted.",
        created.updatedAt
      );
    }

    if (this.environment.isTraining && isAllowlistedTrainingTestRecipient) {
      logger.info({
        scope: "notification",
        event: "Training Test Delivery Allowed",
        runtimeEnvironment: this.environment.name,
        channel: payload.channel,
        recipient: payload.recipient,
      });
    }

    const adapter = this.adapters[payload.channel];
    const adapterResult = await adapter.send({
      recipient: payload.recipient,
      subject,
      message,
      eventType: payload.eventType,
      sourceEntityId: payload.sourceEntityId,
    });

    const created = await this.repository.createNotificationLog({
      templateId,
      eventType: payload.eventType,
      sourceModule: payload.sourceModule,
      sourceEntityId: payload.sourceEntityId,
      channel: payload.channel,
      recipient: payload.recipient,
      message,
      status: adapterResult.status === "SENT" ? "SENT" : "FAILED",
      attemptCount: adapterResult.status === "SENT" ? 1 : Math.min(1, channelSetting.maxRetries),
      errorMessage: adapterResult.errorMessage,
      responseId: adapterResult.responseId,
      sentAt: adapterResult.status === "SENT" ? new Date() : undefined,
      sentById: payload.sentById,
    });

    return NotificationMapper.toMutationResponse(
      created.id,
      adapterResult.status === "SENT"
        ? "Notification sent successfully."
        : "Notification delivery failed and has been recorded for retry.",
      created.updatedAt
    );
  }

  async markRead(notificationIdInput: unknown): Promise<NotificationMutationResponseDto> {
    const notificationId = validateNotificationIdParam(notificationIdInput);
    await this.assertNotificationExists(notificationId);
    const updated = await this.repository.markNotificationRead(notificationId);
    return NotificationMapper.toMutationResponse(notificationId, "Notification marked as read.", updated.updatedAt);
  }

  async archive(notificationIdInput: unknown): Promise<NotificationMutationResponseDto> {
    const notificationId = validateNotificationIdParam(notificationIdInput);
    await this.assertNotificationExists(notificationId);
    const updated = await this.repository.archiveNotification(notificationId);
    return NotificationMapper.toMutationResponse(notificationId, "Notification archived successfully.", updated.updatedAt);
  }

  async getTemplates(): Promise<NotificationTemplateDto[]> {
    return NotificationMapper.toTemplates(await this.repository.listTemplates());
  }

  async createTemplate(payloadInput: unknown): Promise<NotificationTemplateDto> {
    const payload = validateCreateNotificationTemplateDto(payloadInput);
    const existing = (await this.repository.listTemplates()).find(
      (template) => template.name.toLowerCase() === payload.name.toLowerCase()
    );
    if (existing) {
      throw new ConflictError(`Notification template ${payload.name} already exists.`);
    }
    const created = await this.repository.createTemplate(payload);
    return NotificationMapper.toTemplate(created);
  }

  async updateTemplate(templateIdInput: unknown, payloadInput: unknown): Promise<NotificationTemplateDto> {
    const templateId = validateTemplateIdParam(templateIdInput);
    const payload = validateUpdateNotificationTemplateDto(payloadInput);
    const existing = await this.repository.findTemplateById(templateId);
    if (!existing) {
      throw new NotFoundError(`Template with id ${templateId} was not found.`);
    }
    const updated = await this.repository.updateTemplate(templateId, payload);
    return NotificationMapper.toTemplate(updated);
  }

  async getSettings(): Promise<NotificationChannelSettingDto[]> {
    return NotificationMapper.toSettings(await this.getResolvedSettings());
  }

  async updateSettings(payloadInput: unknown): Promise<NotificationChannelSettingDto[]> {
    const payload = validateUpdateNotificationSettingsDto(payloadInput);
    const updated = await this.repository.upsertSettings(payload);
    return NotificationMapper.toSettings(updated);
  }

  private async assertNotificationExists(notificationId: string): Promise<void> {
    const row = await this.repository.findNotificationById(notificationId);
    if (!row) {
      throw new NotFoundError(`Notification with id ${notificationId} was not found.`);
    }
  }

  private renderTemplate(content: string, variables?: Record<string, unknown>): string {
    if (!variables) return content;
    return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = variables[key];
      if (value == null) return "";
      return String(value);
    });
  }

  private async getResolvedSettings() {
    const existing = await this.repository.listSettings();
    if (existing.length > 0) {
      return existing;
    }
    await this.repository.upsertSettings({ settings: DEFAULT_SETTINGS });
    return this.repository.listSettings();
  }
}
