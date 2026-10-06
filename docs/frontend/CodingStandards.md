# Frontend Coding Standards

## Naming
- Components: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Store files: `<domain>Store.ts`
- Route modules: `<scope>.routes.tsx`

## Imports
- Prefer aliases (`@/...`) over deep relative imports.
- Keep imports grouped and alphabetized.

## Components
- Shared primitives go to `components/ui`.
- Feature UI goes inside `features/<feature>/components`.
- Keep components focused and composable.

## State Management
- Zustand is the single global state mechanism.
- No duplicate context-based state for auth/theme persistence.

## Routing
- Route declarations must be split by concern: auth vs app.
- Guarded routes use `ProtectedRoute`.

## Theme
- Use `ThemeProvider` + Zustand-backed `themeStore`.
- Support `light`, `dark`, and `system`.
