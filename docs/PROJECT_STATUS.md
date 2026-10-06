# MSPL Assist - Project Status

## Assessment scope

This document records the implementation state observed in the repository as of July 2026. It is an engineering assessment, not a replacement for approved product requirements. Where existing documents conflict with source code, source code is treated as the description of current behavior.

## Product summary

MSPL Assist is a mobility-operations support platform. It combines a coordinator web portal, ticket/workshop operations, an unexposed WhatsApp-oriented conversation engine, and an Excel-to-PostgreSQL synchronization workflow backed by Microsoft Graph and OneDrive/SharePoint.

## Frozen business terminology

The business entity is a **Rider**. `Customer` remains only as a legacy persistence, source-code, and API-contract term. The Rider Phone Number is the canonical business key; Rider Name is display-only and must never be used to identify or merge riders.

## Module status

| Area | Current state | Evidence / limitations |
| --- | --- | --- |
| Frontend portal | Implemented | React/Vite portal has dashboard, tickets, customers, vehicles, deployments, workshop, notifications, reports, analytics, and settings routes. |
| Backend API | Implemented | Express controllers/services/repositories/validators/DTOs expose REST endpoints under `/api/v1`. |
| Authentication | Implemented | First-admin bootstrap, bcrypt passwords, access/refresh JWTs, frontend session restoration. |
| Authorization | Partially implemented | Middleware and roles exist, but most business route groups do not require a token or role. |
| Rider module (legacy Customer API) | Implemented | List/search/create/update/deactivate, profile, timeline, rental history, active vehicles, documents. Search supports ID, name, registered, alternate, and WhatsApp mobile numbers. |
| Vehicle module | Implemented as operational view | Inventory/provider views, history, health and status summaries. Activation/deactivation currently validate and return a response rather than changing a distinct vehicle record. |
| Deployment module | Implemented | List/search/dashboard/detail/status/history/payment/close/reopen operations. |
| Ticket module | Implemented | Ticket creation, active-ticket prevention, comments, attachments, technician assignment, status, ETA, charges, and audit records. |
| Workshop module | Implemented | Ticket-backed workshop job lifecycle and related lookup/provider integration. |
| Conversation engine | Implemented but not externally integrated | State handlers and persistence exist; no WhatsApp webhook/provider route was found. |
| Notifications | Partial | Templates, settings and logs exist; the delivery adapter is simulated. |
| Operational Data Wizard | Implemented | Microsoft 365 auth, OneDrive browsing, workbook/sheet selection, mapping, preview, save and manual sync. |
| Microsoft Graph | Implemented | OAuth code exchange, encrypted token persistence, refresh, OneDrive browsing, Graph/content download. |
| Scheduler | Implemented | Interval schedules and PostgreSQL advisory lock; no change-detection short-circuit is implemented. |
| Current Rider Snapshot | Implemented | Synchronization produces and persists one current-state snapshot per Rider Phone Number; operational providers consume it first and retain live source calculation only as a pre-sync compatibility fallback. |
| Test automation | Backend only | Jest unit/controller/repository/integration coverage exists; no application-owned frontend tests were found. |

## Release readiness observations

The backend has clear domain layering and broad backend test coverage. Production readiness is constrained by authorization gaps, incomplete external delivery integrations, and unresolved synchronization ownership/atomicity decisions.

## Technical debt and risks

1. **Route security:** ticket, customer, vehicle, deployment, workshop, notification, report, and admin route groups are not consistently protected with authentication/role middleware.
2. **Browser token storage:** the frontend persists access and refresh tokens in Zustand local storage, increasing the impact of an XSS compromise.
3. **Configuration coupling:** backend startup fails when Microsoft 365 settings are absent or placeholder values, even if workbook sync is not needed in that environment.
4. **OAuth state handling:** an OAuth state value is generated but no state persistence/validation was found; callback redirect URLs are hard-coded to the local frontend address.
5. **Partial imports:** the operational-data design describes atomic import, while the active persistence service applies joined records in separate transactions.
6. **Sync numbering:** `SyncHistory.syncNumber` is unique while the active `SyncService` counter starts in process memory; restart behavior needs an explicit database-backed strategy.
7. **Overlapping persistence:** legacy `AppSetting` JSON records coexist with the newer `OperationalDataset`/schema/snapshot tables. The authoritative model is not documented.
8. **External integrations:** notifications are simulated and the conversation engine is not connected to a WhatsApp transport.
9. **Operational scale:** sync performs workbook downloads and row-oriented operations without documented Graph pagination, retry/backoff, rate-limit, or large-workbook strategy.

## Documentation gaps and ambiguities

- Existing documentation includes root README/UAT/release material; `docs/00` through `docs/16` system/product/architecture/test documents; ADRs; frontend guidance; per-module specifications; and integration reports. It is valuable historical context but not a single maintained source of truth.
- The root README and the frozen v1 documents describe an earlier scope; the current Graph/wizard/scheduler implementation is newer.
- `ARCHITECTURE_V2_*` describes a future operational-data platform, but parts of that platform are already represented in the schema and implementation.
- Existing database documentation does not fully reflect current Prisma field names, notification models, Graph token storage, or dataset/versioning models.
- The operational data source of truth needs approval: raw Excel, AppSetting-backed staged rows, or the dedicated dataset models.
- Expected behavior for manual edits to customers/deployments after a future sync is not specified.

## Recommended next decisions (no implementation implied)

1. Approve one operational-data architecture and migration path.
2. Define an API RBAC matrix for every endpoint and role.
3. Define a production session/token-storage policy.
4. Define import consistency, idempotency, deletion, and conflict rules.
5. Decide when WhatsApp and real notification providers become required capabilities.
6. Reconcile product, architecture, database, API, and UAT documents against the current implementation.
