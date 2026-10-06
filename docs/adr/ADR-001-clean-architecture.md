# ADR-001: Clean Architecture Boundaries

## Decision

Ticket workflow rules are isolated from React rendering and HTTP transport. UI components render state and dispatch actions through the web adapter only.

## Consequence

The workflow can be reused by future channel adapters without moving business validation into UI code.
