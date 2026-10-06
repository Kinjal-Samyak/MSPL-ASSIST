export interface UpdateTicketPriorityDto {
  priority: string; // LOW | MEDIUM | HIGH | CRITICAL
  reason: string;
}

export interface TicketPriorityChangeDto {
  id: string;
  previousPriority: string;
  newPriority: string;
  reason: string;
  changedByName: string;
  changedByRole: string;
  createdAt: string;
}

export interface TicketPriorityUpdateResponseDto {
  ticketId: string;
  priority: string;
  change: TicketPriorityChangeDto;
}
