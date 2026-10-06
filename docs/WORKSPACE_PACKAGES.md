# MSPL Assist Workspace Packages

MSPL Assist uses npm workspaces to keep reusable domain behaviour independent of the frontend and backend applications.

```text
packages/
  conversation-workflow/  Pure ticket-creation workflow
  shared-types/           Channel-neutral TypeScript contracts
  shared-validation/      Channel-neutral validation primitives
  shared-constants/       Business vocabulary and stable enum values
  shared-utils/           Pure formatting, parsing, and collection helpers
frontend/                 React Web Adapter and operations portal
backend/                  Express API and infrastructure adapters
```

## Dependency direction

```text
shared-constants   shared-types   shared-validation   shared-utils
       \              |              /                  /
        conversation-workflow
            /          \
      frontend          backend
```

`conversation-workflow` contains deterministic state transitions and validation flow only. It cannot import React, Express, Prisma, browser APIs, database access, or HTTP transports. This makes it safe to reuse from the existing web adapter and future WhatsApp, mobile, or API adapters.

## Commands

- `npm install` — installs workspace links and root build tooling.
- `npm run build:shared` — compiles the shared packages.
- `npm run build` — builds shared packages, backend, then frontend.
- `npm run test:workflow` — runs the pure workflow contract tests.

Frontend development resolves workspace TypeScript source through Vite so updates are immediately available. Backend runtime resolution uses the package build output. Both paths are produced from the same package source; no workflow logic is copied into either application.

## Package boundaries

- Put only channel-neutral models in `shared-types`; do not move React `File`, JSX, or browser-specific DTOs there.
- Put reusable, transport-independent checks in `shared-validation`.
- Put stable, cross-channel business vocabulary in `shared-constants`. Database enum changes remain Prisma migration work; a shared constant never changes persistence on its own.
- Put framework-independent formatting, parsing, normalization, and collection helpers in `shared-utils`. Do not place business decisions there.
- Put workflow transitions and domain validation gates in `conversation-workflow`.
- Keep UI rendering, file previews, and HTTP calls inside `frontend`.
- Keep sessions, persistence, idempotency, Graph/Meta clients, and Express endpoints inside `backend`.
