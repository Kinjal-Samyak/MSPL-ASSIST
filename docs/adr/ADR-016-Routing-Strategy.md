# ADR-016: Routing Strategy

- Status: Accepted
- Date: 2026-07-10

## Context
A single large router file becomes difficult to evolve.

## Decision
Split route declarations into `auth.routes.tsx` and `app.routes.tsx`, composed from `routes/index.ts`.

## Consequences
- Better separation of concerns.
- Easier onboarding and route maintenance.
