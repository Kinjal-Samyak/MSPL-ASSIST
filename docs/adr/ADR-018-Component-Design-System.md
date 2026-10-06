# ADR-018: Component Design System

- Status: Accepted
- Date: 2026-07-10

## Context
Feature teams need a stable, reusable component foundation.

## Decision
Maintain a shared design system in `src/components` (ui, feedback, layout, tables), while feature-specific UI lives inside feature modules.

## Consequences
- Improved consistency and reuse.
- Clear boundary between shared primitives and feature implementations.
