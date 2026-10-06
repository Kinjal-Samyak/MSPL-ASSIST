import type { CommunicationCenterEventType } from "./notification.dto";

export type CommunicationRecipientType = "PRIMARY" | "ALTERNATE";

export interface TicketCommunicationEventStatusDto {
  eventType: CommunicationCenterEventType;
  enabled: boolean;
  reason: string;
  lastStatus: string | null;
  lastSentAt: string | null;
  lastRecipient: string | null;
}

export interface TicketCommunicationHistoryItemDto {
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

export interface TicketCommunicationCenterDto {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  primaryPhone: string;
  alternatePhone: string | null;
  events: TicketCommunicationEventStatusDto[];
  suggestedEvent: CommunicationCenterEventType | null;
  suggestedReason: string | null;
  health: "UP_TO_DATE" | "UPDATE_RECOMMENDED" | "NOT_UPDATED";
  history: TicketCommunicationHistoryItemDto[];
}

export interface SendTicketCommunicationDto {
  eventType: CommunicationCenterEventType;
  recipient: string;
  recipientType: CommunicationRecipientType;
  customMessage?: string;
}

export interface ResendTicketCommunicationDto {
  recipient?: string;
  recipientType?: CommunicationRecipientType;
}

export interface TicketCommunicationMutationResponseDto {
  communicationId: string;
  status: string;
  message: string;
}
