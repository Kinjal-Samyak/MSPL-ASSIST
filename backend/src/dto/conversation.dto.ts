export interface ConversationRequestDto {
  whatsappNumber: string;
  message: string;
}

export interface ConversationSessionDto {
  id: string;
  whatsappNumber: string;
  customerId: string | null;
  currentTicketId: string | null;
  currentState: string;
  conversationData: Record<string, unknown>;
  lastInteractionAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponseDto {
  session: ConversationSessionDto;
  isNewSession: boolean;
  isExpired: boolean;
  requiresReset: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}
