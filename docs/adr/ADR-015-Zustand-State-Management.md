# ADR-015: Zustand State Management

- Status: Accepted
- Date: 2026-07-10

## Context
Multiple state patterns increase complexity and inconsistency.

## Decision
Use Zustand stores as the single global state source (auth/theme/settings), with persistence middleware.

## Consequences
- Reduced boilerplate versus Redux.
- Clear single source of truth for auth and theme.
