# Frontend Architecture (FE-1.2)

## Overview
MSPL Assist frontend uses a layered UI architecture with feature-first modules for domain screens, shared design-system components, centralized routing, and Zustand-based state.

## Layers
- **App Shell**: `layouts/` (AppLayout + AuthLayout)
- **Features**: `features/*` domain-specific UI modules
- **Shared UI**: `components/` reusable primitives and patterns
- **State**: `store/` Zustand stores
- **Platform**: `api/`, `config/`, `routes/`, `themes/`, `utils/`, `types/`

## Key Decisions
- Feature pages moved to `features/<module>/pages`
- Route definitions split into `auth.routes.tsx` and `app.routes.tsx`
- Theme orchestration through `ThemeProvider`, persistence through Zustand
- Single auth source of truth via Zustand store (AuthContext removed)
