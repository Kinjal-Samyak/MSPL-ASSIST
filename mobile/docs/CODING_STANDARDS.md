# Coding Standards

These are the conventions already consistently applied across the codebase — this document
records them so they stay consistent, not so they change.

## TypeScript

- `strict: true` (tsconfig). No `any` — use the interface/model type, or a narrowly-scoped local
  interface (e.g. `usePermission`'s `MinimalPermissionResponse`) when two libraries' equivalent
  types don't quite line up.
- Path alias `@/*` → `src/*`, configured identically in `tsconfig.json` (`compilerOptions.paths`)
  and `babel.config.js` (`module-resolver`). Both must stay in sync — a mismatch produces
  "works in the editor, fails at runtime" bugs.
- Import types with `import type { X } from '...'` when a symbol is type-only.

## File shape per layer

Every repository, manager, and facade follows the same file layout — see
[REPOSITORY_PATTERN.md](./REPOSITORY_PATTERN.md) and [FACADE_PATTERN.md](./FACADE_PATTERN.md). A
new domain should be added by copying an existing domain's file layout, not by inventing a new
one.

## Comments

Default to no comments. A comment earns its place only when it explains a *why* that isn't
recoverable from the code itself — a constraint, an intentional omission, a workaround. Nearly
every file header in this codebase is one such comment, and it consistently states: what this
file's responsibility is, what layer it belongs to, and what it must never do. New files should
follow that same header convention.

## Components

- Named exports, not default exports (`export function Button(...)`, not `export default`).
- `memo()` on any component rendered inside a list (`JobListItemCard`, `EvidenceThumbnail`, every
  `JobDetails` section card) — already applied consistently; keep applying it to new list-item
  components.
- Styles via `StyleSheet.create` at module scope, not inline object literals recreated every
  render (theme-dependent values are the one exception, since they must be computed from
  `useTheme()`).
- Accessibility props (`accessibilityRole`, `accessibilityLabel`, `accessibilityHint`,
  `accessibilityState`) on every interactive element — see the Accessibility Review for the one
  known gap.

## Repositories / Managers / Facades

- Constructor injection with a real singleton default — never a hard-coded `new
  MockXRepository()` inside a manager/facade body. This is what makes every orchestration layer
  unit-testable without a mocking framework.
- No business logic. If you're about to write an `if` that decides whether an action is *allowed*
  (not just whether to *call* something), that logic belongs in the backend, not here.

## Formatting / linting

`mobile/` is intentionally excluded from the root npm workspace (`package.json`'s `workspaces`
list is `["frontend", "backend", "packages/*"]`) — see
[CONTRIBUTING.md](./CONTRIBUTING.md). The root ESLint/Prettier/Husky/lint-staged tooling does not
currently reach into `mobile/` (only `frontend/` has its own `eslint.config.js`; there is no
`mobile/`-scoped lint config yet). Until one exists, run `npx tsc --noEmit` inside `mobile/` before
every commit that touches `.ts`/`.tsx` files — strict-mode compilation is the only automated check
in force here today. `npm test` (see [TESTING.md](./TESTING.md)) should be run alongside it.
