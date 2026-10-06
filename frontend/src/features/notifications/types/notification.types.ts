import type {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from '@/services/notificationService';

export interface NotificationFiltersState {
  search: string;
  channel: '' | NotificationChannel;
  status: '' | NotificationStatus;
  eventType: '' | NotificationEventType;
  archived: '' | 'true' | 'false';
}

export interface NotificationSortState {
  key: 'createdAt' | 'updatedAt' | 'channel' | 'status' | 'eventType';
  direction: 'asc' | 'desc';
}

export interface SendNotificationFormState {
  eventType: NotificationEventType;
  sourceModule: 'TICKET' | 'CUSTOMER' | 'VEHICLE' | 'DEPLOYMENT' | 'WORKSHOP' | 'ADMIN';
  sourceEntityId: string;
  channel: NotificationChannel;
  recipient: string;
  templateId: string;
  message: string;
}

export interface TemplateFormState {
  name: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject: string;
  content: string;
  active: boolean;
}
