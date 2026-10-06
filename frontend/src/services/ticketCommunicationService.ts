import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export type CommunicationCenterEventType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'REPAIR_STARTED'
  | 'WAITING_FOR_PARTS'
  | 'WORK_COMPLETED'
  | 'READY_FOR_DELIVERY'
  | 'TICKET_CHARGES_UPDATED'
  | 'TICKET_CLOSED'
  | 'TICKET_CANCELLED'
  | 'GENERAL_ANNOUNCEMENT'
  | 'VEHICLE_PENDING_PICKUP_REMINDER';

export type CommunicationRecipientType = 'PRIMARY' | 'ALTERNATE';
export type CommunicationHealth = 'UP_TO_DATE' | 'UPDATE_RECOMMENDED' | 'NOT_UPDATED';

export interface TicketCommunicationEventStatus {
  eventType: CommunicationCenterEventType;
  enabled: boolean;
  reason: string;
  lastStatus: string | null;
  lastSentAt: string | null;
  lastRecipient: string | null;
}

export interface TicketCommunicationHistoryItem {
  communicationId: string;
  eventType: CommunicationCenterEventType;
  templateName: string | null;
  message: string;
  recipient: string;
  status: string;
  sentByName: string | null;
  sentAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

export interface TicketCommunicationCenter {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  primaryPhone: string;
  alternatePhone: string | null;
  events: TicketCommunicationEventStatus[];
  suggestedEvent: CommunicationCenterEventType | null;
  suggestedReason: string | null;
  health: CommunicationHealth;
  history: TicketCommunicationHistoryItem[];
}

export interface SendTicketCommunicationPayload {
  eventType: CommunicationCenterEventType;
  recipient: string;
  recipientType: CommunicationRecipientType;
  customMessage?: string;
}

export interface ResendTicketCommunicationPayload {
  recipient?: string;
  recipientType?: CommunicationRecipientType;
}

export interface TicketCommunicationMutationResponse {
  communicationId: string;
  status: string;
  message: string;
}

export const COMMUNICATION_EVENT_LABELS: Record<CommunicationCenterEventType, string> = {
  TICKET_CREATED: 'Ticket Created',
  TICKET_ASSIGNED: 'Ticket Assigned',
  REPAIR_STARTED: 'Repair Started',
  WAITING_FOR_PARTS: 'Waiting For Parts',
  WORK_COMPLETED: 'Work Completed',
  READY_FOR_DELIVERY: 'Ready For Delivery',
  TICKET_CHARGES_UPDATED: 'Service Charges Updated',
  TICKET_CLOSED: 'Ticket Closed',
  TICKET_CANCELLED: 'Ticket Cancelled',
  GENERAL_ANNOUNCEMENT: 'General Announcement',
  VEHICLE_PENDING_PICKUP_REMINDER: 'Vehicle Pending Pickup Reminder',
};

export const ticketCommunicationService = {
  async getCommunicationCenter(ticketId: string): Promise<TicketCommunicationCenter> {
    const response = await apiClient.get<ApiSuccessResponse<TicketCommunicationCenter>>(
      `/api/v1/tickets/${ticketId}/communication-center`
    );
    return unwrapApiData(response);
  },

  async send(
    ticketId: string,
    payload: SendTicketCommunicationPayload
  ): Promise<TicketCommunicationMutationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<TicketCommunicationMutationResponse>>(
      `/api/v1/tickets/${ticketId}/communication/send`,
      payload
    );
    return unwrapApiData(response);
  },

  async resend(
    communicationId: string,
    payload: ResendTicketCommunicationPayload = {}
  ): Promise<TicketCommunicationMutationResponse> {
    const response = await apiClient.post<ApiSuccessResponse<TicketCommunicationMutationResponse>>(
      `/api/v1/tickets/communication/${communicationId}/resend`,
      payload
    );
    return unwrapApiData(response);
  },
};
