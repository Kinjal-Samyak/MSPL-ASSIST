# ADR-003: Channel Adapter Pattern

## Decision

React is a web adapter. It performs rendering, focus management, local file-preview handling, and API transport. The backend's future WhatsApp Adapter imports the same shared workflow through `whatsapp-workflow.port.ts`. Neither adapter defines workflow ordering or validation rules.

## Diagram

`Workflow Engine <- Web Adapter (React) -> POST /api/v1/tickets/conversation`

Future WhatsApp and mobile adapters will map their channel inputs to the same workflow actions and prepared request.
