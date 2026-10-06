# MSPL Assist - Architecture

## Domain terminology and compatibility

Rider is the business-domain term throughout the application. The existing `Customer` Prisma model, backend module names, payload fields, and `/api/v1/customers` routes are retained compatibility boundaries, not separate business entities. Rider Phone Number is the canonical identity; Rider Name is a display attribute only.

## System topology

```text
packages/
  conversation-workflow  -> pure ticket-creation state machine
  shared-types           -> channel-neutral TypeScript contracts
  shared-validation      -> channel-neutral validation primitives
  shared-constants       -> channel-neutral business vocabulary
  shared-utils           -> pure parsing and formatting helpers

React/Vite operations portal
  -> Web Adapter -> @mspl/conversation-workflow
  -> Axios client and Zustand stores
  -> Express REST API
       -> future channel adapters -> @mspl/conversation-workflow
       -> controllers -> services -> repositories -> Prisma
       -> conversation state handlers
       -> Excel/Graph synchronization services
  -> PostgreSQL

Microsoft Entra ID / Microsoft Graph
  -> OAuth token exchange and encrypted token persistence
  -> OneDrive/SharePoint drive browsing and workbook download
```

## Workspace packages

The repository is an npm-workspaces monorepo. `frontend` and `backend` remain independently runnable applications; `packages/*` contains reusable, transport-independent code. The root `npm run build` builds shared packages first and then validates both applications.

| Package | Responsibility | Allowed dependencies |
| --- | --- | --- |
| `@mspl/conversation-workflow` | Deterministic ticket-conversation steps, transitions, validation gates, completion preparation | `@mspl/shared-constants`, `@mspl/shared-types`, `@mspl/shared-validation` only |
| `@mspl/shared-types` | Channel-neutral TypeScript definitions | No framework, runtime, or infrastructure imports |
| `@mspl/shared-validation` | Serialisable validation primitives | No framework, runtime, or infrastructure imports |
| `@mspl/shared-constants` | Stable cross-channel business status/role vocabulary | No persistence, framework, or infrastructure imports |
| `@mspl/shared-utils` | Pure formatting, parsing, and collection/error helpers | No business decisions, framework, or infrastructure imports |

No workspace package may import React, browser APIs, Express, Prisma, database repositories, or transport clients. Browser file previews remain in the frontend Web Adapter; session persistence and future WhatsApp transport remain backend infrastructure concerns.

## Frontend architecture

The frontend is React + TypeScript + Vite. Tailwind and local shared components provide the design system.

| Layer | Location | Responsibility |
| --- | --- | --- |
| Entry/runtime | `src/main.tsx`, `src/App.tsx` | Router and providers | 
| Routes/layouts | `src/routes`, `src/layouts` | Public login route, protected shell, navigation | 
| Features | `src/features/<module>` | Domain pages, components, local feature types | 
| Shared UI | `src/components` | UI primitives, tables, modal/drawer, feedback components | 
| Integration | `src/services`, `src/api`, `src/config` | Axios client, domain API clients, environment configuration | 
| State | `src/store` | Auth, theme, and settings state via Zustand |

The ticket Conversation Engine Web Adapter consumes `@mspl/conversation-workflow`; Vite resolves that workspace source during web development/build, while the backend consumes the compiled workspace package.

Authentication is restored by `AuthSessionBootstrap`. The Axios response interceptor makes one refresh-token attempt after a non-auth `401`; failure clears the stored session and redirects to login.

Feature pages are present for dashboard, tickets, riders (legacy customer route), vehicles, deployments, workshop, notifications, reports, analytics, and settings. The settings page owns the Operational Data Wizard state and retains selected workbooks locally until configuration is saved.

## Backend architecture

| Layer | Location | Responsibility |
| --- | --- | --- |
| HTTP | `src/routes`, `src/controllers`, `src/middleware` | Routing, response envelopes, errors, authentication | 
| Application | `src/services`, `src/conversations`, `src/excel` | Domain rules, workflows, Graph orchestration, sync | 
| Contracts | `src/dto`, `src/validators`, `src/types` | Typed DTOs, input normalization and validation | 
| Data access | `src/repositories`, `src/datasources` | Prisma persistence and operational source abstractions | 
| Infrastructure | `prisma`, Docker, GitHub Actions | PostgreSQL schema, local containers, CI | 

The API is composed in `backend/src/app.ts`. It applies Helmet, CORS, JSON/urlencoded parsing, Morgan logging, not-found handling, and global error handling. API responses generally use `{ success, data }` envelopes.

## Core backend domains

- **Auth/setup:** bootstrap, login, refresh, logout, current user.
- **Ticketing:** ticket creation and operations; services use repositories and mappers.
- **Conversation:** a persisted state machine with handler factory, context, commands and ticket mapper.
- **Operational providers:** provider registry with inventory, deployment and lookup services backed by a datasource abstraction.
- **Operational data:** workbook wizard validation/configuration and Graph/OneDrive capabilities.
- **Sync:** Excel parsing, mapping, validation, staging, joining, persistence, scheduling and history.
- **Current Rider Snapshot:** one persisted operational projection per Rider Phone Number. Operational consumers read this projection rather than recalculating plan, vehicle, or account rules from workbook history.

## Request flow

```text
HTTP request
  -> route
  -> controller
  -> validator + service
  -> repository/provider
  -> Prisma/PostgreSQL
  -> mapper
  -> response envelope
```

## Database architecture

Prisma targets PostgreSQL. The main data groups are:

| Group | Principal models |
| --- | --- |
| Operations | Customer, Deployment, Hub, VehicleModel, Ticket, TicketIssueItem | 
| Ticket audit/communication | TicketHistory, TicketActivity, TicketAttachment, TicketComment, NotificationLog | 
| Access/control | User, UserHub, AppSetting, ConversationSession | 
| Notification module | NotificationMessage, NotificationTemplate, NotificationChannelSetting | 
| Workbook configuration | WorkbookConfiguration, WorksheetConfiguration, ColumnMapping, RelationshipMapping, WorkbookSchemaVersion | 
| Sync/runtime | SyncHistory, SyncRun, SyncAuditLog, MicrosoftGraphToken | 
| Dataset platform | OperationalDataset, SchemaVersion, DatasetVersion, DatasetSnapshot, DryRunResult, MicrosoftGraphConnection and related validation/metadata models | 

## Authentication and authorization architecture

```text
Empty system -> POST /setup/bootstrap -> ADMIN user
Login -> bcrypt comparison -> access JWT + refresh JWT
Refresh token -> hash comparison in User row -> rotated token pair
Frontend -> Bearer access token -> requireAccessToken -> req.authUser
```

The roles are ADMIN, COORDINATOR and TECHNICIAN. `requireRoles` is used for privileged operational-data changes, but enforcement has not been applied consistently across all route groups.

## Microsoft Graph and Operational Data Wizard

Graph OAuth uses Microsoft Entra's authorization-code flow. Tokens are AES-256-GCM encrypted before persistence in `MicrosoftGraphToken`; tokens are refreshed near expiry. The Graph file service lists drives and folders and filters to Excel files. The cloud-workbook service downloads selected workbooks from a share URL or a drive/item identity.

The wizard workflow is:

```text
Authenticate Microsoft 365
 -> browse OneDrive
 -> select master and inventory workbooks
 -> validate / list worksheets
 -> load headers
 -> suggest relationship and column mappings
 -> preview data quality and match counts
 -> save configuration
 -> run manual sync or enable scheduler
```

## Synchronization and scheduler architecture

```text
Configured workbooks
 -> CloudWorkbookService / Excel reader
 -> ExcelSyncRowMapper
 -> ExcelSyncValidationService
 -> ExcelSynchronizationService (master + inventory in parallel)
 -> AppSetting-backed sync staging
 -> SyncedOperationalDataSource + RiderAssignmentService
 -> SyncPersistenceService
 -> Customer, Hub, VehicleModel, Deployment upserts
 -> Sync status/history/audit records
```

`startSyncScheduler()` uses a PostgreSQL advisory lock. When configuration enables a non-manual mode, `IntervalSyncScheduler` invokes `SyncService.runSync` at the configured interval. The lock prevents two scheduler processes from becoming active, but manual-run concurrency is guarded only by an in-memory `running` flag.

## Deployment and CI

Docker Compose provides PostgreSQL, pgAdmin and backend development runtime. GitHub Actions installs both projects, runs Prisma validation/generation, builds frontend/backend, runs backend unit/integration/API tests and uploads coverage artifacts.

## Architecture decisions requiring confirmation

- Whether Microsoft 365 is an optional feature or a mandatory runtime dependency.
- Whether `AppSetting` staging or the OperationalDataset models own sync data going forward.
- Whether sync must be atomic per workbook or may partially apply valid rows.
- Which APIs must be exposed to each role and whether customer-facing/WhatsApp endpoints will be added.
