# ADR-014: Frontend Folder Strategy

- Status: Accepted
- Date: 2026-07-10

## Context
The initial structure centralized most screens under `pages/`, which reduced long-term modularity.

## Decision
Adopt feature-first folders under `src/features/<feature>` with `pages/components/hooks/api/types`.

## Consequences
- Better module ownership and future scalability.
- Shared artifacts remain in top-level shared folders.
