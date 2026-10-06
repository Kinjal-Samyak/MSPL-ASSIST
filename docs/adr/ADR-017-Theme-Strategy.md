# ADR-017: Theme Strategy

- Status: Accepted
- Date: 2026-07-10

## Context
Theme behavior must be consistent and persistent across sessions.

## Decision
Use Zustand `themeStore` as persistence layer and a `ThemeProvider` to initialize runtime theme class handling.

## Consequences
- Deterministic startup theme behavior.
- Retains support for light, dark, and system modes.
