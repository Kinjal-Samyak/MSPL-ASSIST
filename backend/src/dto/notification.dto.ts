export type NotificationChannel = "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";
export type NotificationDeliveryStatus = "NOT_SENT" | "SENT" | "FAILED";
export type SortOrder = "asc" | "desc";
export type NotificationSortBy = "createdAt" | "updatedAt" | "channel" | "status" | "eventType";
export type NotificationSourceModule =
  | "TICKET"
  | "CUSTOMER"
  | "VEHICLE"
  | "DEPLOYMENT"
  | "WORKSHOP"
  | "ADMIN";
export type NotificationEventType =
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_CLOSED"
  | "TICKET_STATUS_UPDATED"
  | "TICKET_ETA_UPDATED"
  | "TICKET_CHARGES_UPDATED"
  | "WORKSHOP_ASSIGNED"
  | "WORKSHOP_COMPLETED"
  | "DEPLOYMENT_STARTED"
  | "DEPLOYMENT_CLOSED"
  | "CUSTOMER_CREATED"
  | "VEHICLE_ACTIVATED"
  | "VEHICLE_DEACTIVATED"
  | "USER_CREATED"
  | "USER_UPDATED"
  // Communication Center events (Coordinator-triggered customer updates, ticket-scoped)
  | "REPAIR_STARTED"
  | "WAITING_FOR_PARTS"
  | "WORK_COMPLETED"
  | "READY_FOR_DELIVERY"
  | "TICKET_CANCELLED"
  | "GENERAL_ANNOUNCEMENT"
  | "VEHICLE_PENDING_PICKUP_REMINDER";

export type CommunicationCenterEventType =
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "REPAIR_STARTED"
  | "WAITING_FOR_PARTS"
  | "WORK_COMPLETED"
  | "READY_FOR_DELIVERY"
  | "TICKET_CHARGES_UPDATED"
  | "TICKET_CLOSED"
  | "TICKET_CANCELLED"
  | "GENERAL_ANNOUNCEMENT"
  | "VEHICLE_PENDING_PICKUP_REMINDER";

/** The 11 events surfaced in the Ticket Communication Center panel, in display order. */
export const COMMUNICATION_CENTER_EVENT_TYPES: readonly CommunicationCenterEventType[] = [
  "TICKET_CREATED",
  "TICKET_ASSIGNED",
  "REPAIR_STARTED",
  "WAITING_FOR_PARTS",
  "WORK_COMPLETED",
  "READY_FOR_DELIVERY",
  "TICKET_CHARGES_UPDATED",
  "TICKET_CLOSED",
  "TICKET_CANCELLED",
  "GENERAL_ANNOUNCEMENT",
  "VEHICLE_PENDING_PICKUP_REMINDER",
];

export interface NotificationDashboardDto {
  totalNotifications: number;
  pendingNotifications: number;
  sentNotifications: number;
  failedNotifications: number;
  unreadNotifications: number;
  archivedNotifications: number;
  totalTemplates: number;
  activeChannels: number;
}

export interface NotificationListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  channel?: NotificationChannel;
  status?: NotificationDeliveryStatus;
  eventType?: NotificationEventType;
  archived?: boolean;
  sortBy: NotificationSortBy;
  sortOrder: SortOrder;
}

export interface NotificationDto {
  notificationId: string;
  eventType: NotificationEventType;
  sourceModule: NotificationSourceModule;
  sourceEntityId: string;
  channel: NotificationChannel;
  recipient: string;
  message: string;
  status: NotificationDeliveryStatus;
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

export interface NotificationListResponseDto {
  items: NotificationDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SendNotificationDto {
  eventType: NotificationEventType;
  sourceModule: NotificationSourceModule;
  sourceEntityId: string;
  channel: NotificationChannel;
  recipient: string;
  message?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  /** The Coordinator/Admin who triggered this send - not part of the client payload, stamped by the controller from the authenticated actor. */
  sentById?: string;
}

export interface NotificationMutationResponseDto {
  notificationId: string;
  status: "SUCCESS";
  message: string;
  updatedAt: string;
}

export interface NotificationTemplateDto {
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

export interface CreateNotificationTemplateDto {
  name: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  active?: boolean;
}

export interface UpdateNotificationTemplateDto {
  name?: string;
  channel?: NotificationChannel;
  subject?: string;
  content?: string;
  active?: boolean;
}

export interface NotificationChannelSettingDto {
  settingId: string;
  channel: NotificationChannel;
  enabled: boolean;
  maxRetries: number;
  updatedAt: string;
}

export interface UpdateNotificationSettingsDto {
  settings: Array<{
    channel: NotificationChannel;
    enabled: boolean;
    maxRetries: number;
  }>;
}
