export type NotificationType = 'NEW_JOB' | 'COORDINATOR_UPDATE' | 'WORKFLOW_UPDATE' | 'SYSTEM' | 'REMINDER';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}
