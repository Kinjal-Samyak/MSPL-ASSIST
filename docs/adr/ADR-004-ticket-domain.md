# ADR-004: Ticket Domain Boundary

## Decision

The additive Conversation Ticket endpoint remains the Ticket-domain boundary. The workflow prepares valid conversation data; the web adapter owns transport and list refresh.

## Consequence

The legacy ticket endpoint and its clients remain backward compatible. Attachment references are supported today; binary file storage requires a separately approved backend capability.
