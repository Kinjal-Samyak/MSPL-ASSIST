import type { CreateTicketDto, TicketCreationResponseDto } from "../dto/ticket.dto";
import { TicketService } from "../services/ticket.service";

export class TicketCreationJob {
  constructor(private readonly ticketService: TicketService) {}

  async execute(payload: CreateTicketDto): Promise<TicketCreationResponseDto> {
    return this.ticketService.createTicket(payload);
  }
}
