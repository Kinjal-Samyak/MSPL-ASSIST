# MSPL Assist System Architecture v1.0

This is the governing technical blueprint for MSPL Assist. It freezes platform boundaries before new Workshop development. It does not alter existing API contracts, persistence, or user-facing behaviour.

## Principles

- **Single source of truth:** a rule has one owner; adapters and views consume it.
- **Channel independence:** web, WhatsApp, mobile, and future APIs use the same workflow/domain contracts.
- **Clean boundaries:** UI, transport, persistence, and business workflow concerns do not leak into each other.
- **Backward compatibility:** existing routes, Prisma models, and clients remain valid unless explicitly versioned.
- **Package isolation:** shared packages have no React, Express, Prisma, browser, database, or transport imports.
- **Thin adapters:** channel-specific code maps input and presentation only; it does not recreate rules.
- **Auditability:** state-changing backend services own their transaction and audit responsibilities.

## Workspace layout

```text
MSPL Assist
├── packages/
│   ├── shared-constants/       Cross-channel business vocabulary
│   ├── shared-types/           Contracts and domain interfaces
│   ├── shared-utils/           Pure helper functions
│   ├── shared-validation/      Reusable validation primitives
│   └── conversation-workflow/  Pure ticket-creation workflow state machine
├── frontend/                   React/Vite Web Adapter
└── backend/                    Express API, services, repositories, Prisma
```

The root `package.json` is the npm-workspace orchestrator. `npm run build` compiles shared packages first, then backend and frontend.

## Package ownership

| Package | Owns | Must never own |
| --- | --- | --- |
| `@mspl/shared-constants` | Stable business enum values, roles, vocabulary, status constants | Persistence mappings, screen-specific UI labels, database access |
| `@mspl/shared-types` | DTO shapes, interfaces, channel-neutral domain contracts | React types, browser `File`, Prisma models |
| `@mspl/shared-utils` | Pure formatters, parsers, normalisers, string/array/object/error helpers | Business decisions, HTTP, environment access |
| `@mspl/shared-validation` | Reusable input and workflow validation primitives | UI state, database queries, transport errors |
| `@mspl/conversation-workflow` | Conversation transitions, ordering, branching, validation flow, completion preparation | JSX, API calls, sessions, database, notifications, uploads |

Allowed direction is `shared-* -> conversation-workflow -> adapters`. Applications may consume packages; packages may not import applications. A shared constant never changes a Prisma/database enum by itself.

## Module boundaries

| Module | Owns | Excludes |
| --- | --- | --- |
| Ticket | Rider-facing ticket creation, retrieval, search, timeline, notifications, status | Workshop operational execution |
| Workshop | Internal case handling after ticket creation: coordinator review, technician work, job cards, inspection, repair, quality check, delivery | Ticket channel rendering and original rider interaction |
| Conversation Workflow Engine | Channel-neutral ticket conversation progression and validation | Channel sessions, UI, HTTP, persistence |
| Channel adapters | Input parsing, rendering, accessibility, session/transport integration | Ticket/workshop business-rule duplication |
| Backend services | Authorization, transactions, domain orchestration, repositories, audit records | React/browser presentation |

The existing Ticket Workspace is a Web Adapter. Future WhatsApp, mobile, and public API adapters must call `@mspl/conversation-workflow`, not copy its logic.

## Domain model and lifecycle

```text
Customer (business term: Rider)
  1 └── * Ticket
              1 └── 0..1 Workshop Case
                           1 └── 0..* Job Card
                                        1 └── 0..* Inspection
                                        1 └── 0..* Repair
                                        1 └── 0..* Quality Check
                           1 └── 0..1 Delivery
              1 └── 0..1 Ticket Closure
```

- Rider/Customer is identified by Rider Phone Number; “Customer” remains only as a persistence/API compatibility name.
- Ticket is the rider-facing source of truth and retains customer-facing history, communication, and lifecycle visibility.
- Workshop Case is an internal operational record created from a Ticket; it cannot exist without that Ticket.
- Job Card cannot exist without a Workshop Case. Inspections, repairs, and quality checks belong to its lifecycle.
- Delivery completes internal operational work; ticket closure remains the Ticket module’s customer-facing lifecycle action.

These relationships are a target module contract. This foundation creates no Workshop models or migrations.

## Conversation architecture

```text
Web / WhatsApp / Mobile / Future API
              │ channel adapter
              ▼
  @mspl/conversation-workflow
              │ prepared ticket request
              ▼
        Ticket service and API
              │
              ▼
  Repository -> Prisma -> PostgreSQL -> audit/timeline/notifications
```

The workflow exposes deterministic create, next, back, edit, cancel, resume, and submit transitions. Adapters own presentation and transport. The backend owns persistence and sessions. WhatsApp retry/idempotency, sessions, and Meta transport are infrastructure concerns, not workflow rules.

## Extension rules and roadmap

1. Put a cross-channel constant, type, utility, or validation primitive in the appropriate `shared-*` package first.
2. Put reusable conversation decisions in `conversation-workflow` and test them without React.
3. Keep browser-only values and feature presentation in `frontend`; keep database/external systems in `backend`.
4. Add models and endpoints only through additive, backwards-compatible migrations and contracts.
5. Do not introduce a second implementation of a workflow or status rule.

The Workshop Domain Design is frozen in `WORKSHOP_ARCHITECTURE_v1.md` and its linked domain/status/lifecycle/permissions/integration documents. Next planned stages are additive Workshop operational entities, a WhatsApp session/transport adapter, and mobile/customer adapters. Each must conform to these boundaries.
