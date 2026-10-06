import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface NotificationResponse {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  sentTime: string | null;
  deliveryTime: string | null;
}

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP';
export type NotificationStatus = 'NOT_SENT' | 'SENT' | 'FAILED';
export type NotificationEventType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_CLOSED'
  | 'TICKET_STATUS_UPDATED'
  | 'TICKET_ETA_UPDATED'
  | 'TICKET_CHARGES_UPDATED'
  | 'WORKSHOP_ASSIGNED'
  | 'WORKSHOP_COMPLETED'
  | 'DEPLOYMENT_STARTED'
  | 'DEPLOYMENT_CLOSED'
  | 'CUSTOMER_CREATED'
  | 'VEHICLE_ACTIVATED'
  | 'VEHICLE_DEACTIVATED'
  | 'USER_CREATED'
  | 'USER_UPDATED';
export type NotificationSourceModule =
  'TICKET' | 'CUSTOMER' | 'VEHICLE' | 'DEPLOYMENT' | 'WORKSHOP' | 'ADMIN';

export interface NotificationDashboardResponse {
  totalNotifications: number;
  pendingNotifications: number;
  sentNotifications: number;
  failedNotifications: number;
  unreadNotifications: number;
  archivedNotifications: number;
  totalTemplates: number;
  activeChannels: number;
}

export interface NotificationListQuery {
  page: number;
  pageSize: number;
  search?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  eventType?: NotificationEventType;
  archived?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'channel' | 'status' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationItem {
  notificationId: string;
  eventType: NotificationEventType;
  sourceModule: NotificationSourceModule;
  sourceEntityId: string;
  channel: NotificationChannel;
  recipient: string;
  message: string;
  status: NotificationStatus;
  retryCount: number;
  lastError: string | null;
  templateId: string | null;
  read: boolean;
  archived: boolean;
  responseId: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SendNotificationPayload {
  eventType: NotificationEventType;
  sourceModule: NotificationSourceModule;
  sourceEntityId: string;
  channel: NotificationChannel;
  recipient: string;
  templateId?: string;
  message?: string;
  variables?: Record<string, string>;
}

export interface NotificationMutationResponse {
  notificationId: string;
  status: 'SUCCESS';
  message: string;
  updatedAt: string;
}

export interface NotificationTemplate {
  templateId: string;
  name: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject: string | null;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationTemplatePayload {
  name: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  active?: boolean;
}

export interface UpdateNotificationTemplatePayload {
  name?: string;
  channel?: NotificationChannel;
  eventType?: NotificationEventType;
  subject?: string;
  content?: string;
  active?: boolean;
}

export interface NotificationChannelSetting {
  settingId: string;
  channel: NotificationChannel;
  enabled: boolean;
  maxRetries: number;
  updatedAt: string;
}

export type NotificationSettingsResponse = NotificationChannelSetting[];

export interface UpdateNotificationSettingsPayload {
  settings: Array<{
    channel: NotificationChannel;
    enabled: boolean;
    maxRetries: number;
  }>;
}

export const notificationService = {
  async getNotifications(ticketId: string): Promise<NotificationResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<NotificationResponse[]>>(
      `/api/v1/tickets/${ticketId}/notifications`
    );
    return unwrapApiData(response);
  },

  async getDashboard(): Promise<NotificationDashboardResponse> {
    const response = await apiClient.get<ApiSuccessResponse<NotificationDashboardResponse>>(
      '/api/v1/notifications/dashboard'
    );
    return unwrapApiData(response);
  },

  async getNotificationList(params: NotificationListQuery): Promise<NotificationListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<NotificationListResponse>>(
      '/api/v1/notifications',
      { params }
    );
    return unwrapApiData(response);
  },

  async getNotificationById(notificationId: string): Promise<NotificationItem> {
    const response = await apiClient.get<ApiSuccessResponse<NotificationItem>>(
      `/api/v1/notifications/${notificationId}`
    );
    return unwrapApiData(response);
  },

  async sendNotification(payload: SendNotificationPayload): Promise<NotificationMutationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<NotificationMutationResponse>>(
      '/api/v1/notifications/send',
      payload
    );
    return unwrapApiData(response);
  },

  async markRead(notificationId: string): Promise<NotificationMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<NotificationMutationResponse>>(
      `/api/v1/notifications/${notificationId}/read`
    );
    return unwrapApiData(response);
  },

  async archive(notificationId: string): Promise<NotificationMutationResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<NotificationMutationResponse>>(
      `/api/v1/notifications/${notificationId}/archive`
    );
    return unwrapApiData(response);
  },

  async getTemplates(): Promise<NotificationTemplate[]> {
    const response = await apiClient.get<ApiSuccessResponse<NotificationTemplate[]>>(
      '/api/v1/notifications/templates'
    );
    return unwrapApiData(response);
  },

  async createTemplate(payload: CreateNotificationTemplatePayload): Promise<NotificationTemplate> {
    const response = await apiClient.post<ApiSuccessResponse<NotificationTemplate>>(
      '/api/v1/notifications/templates',
      payload
    );
    return unwrapApiData(response);
  },

  async updateTemplate(
    templateId: string,
    payload: UpdateNotificationTemplatePayload
  ): Promise<NotificationTemplate> {
    const response = await apiClient.patch<ApiSuccessResponse<NotificationTemplate>>(
      `/api/v1/notifications/templates/${templateId}`,
      payload
    );
    return unwrapApiData(response);
  },

  async getSettings(): Promise<NotificationSettingsResponse> {
    const response = await apiClient.get<ApiSuccessResponse<NotificationSettingsResponse>>(
      '/api/v1/notifications/settings'
    );
    return unwrapApiData(response);
  },

  async updateSettings(
    payload: UpdateNotificationSettingsPayload
  ): Promise<NotificationSettingsResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<NotificationSettingsResponse>>(
      '/api/v1/notifications/settings',
      payload
    );
    return unwrapApiData(response);
  },
};
