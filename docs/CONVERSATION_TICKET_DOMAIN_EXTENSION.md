# Conversation Ticket Domain Extension — Phase 1

The existing ticket API and `TicketService.createTicket` remain unchanged. The additive `POST /api/v1/tickets/conversation` contract uses the legacy service to create the primary ticket, then transactionally stores conversation-only data.

## Additive data model

- `Ticket.rideabilityStatus`: `MOVABLE` or `NOT_MOVABLE` for conversation-created tickets.
- `Ticket.conversationMetadata`: channel-neutral JSON metadata.
- `TicketIssueItem.issueSubcategory`: admin-master subcategory snapshot.
- Existing `TicketIssueItem` supplies multiple issue groups; existing `TicketAttachment` supplies photo references.

Migration `20260718020000_add_conversation_ticket_extension` adds fields only. Existing ticket data and existing request contracts remain valid.

## API

`POST /api/v1/tickets/conversation` accepts registered mobile, MV Track Number, mandatory rideability status, one or more issue groups, optional remarks, photo references, and metadata. It does not alter `POST /api/v1/tickets`.
