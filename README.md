# MSPL Assist

> **Business terminology:** A Rider is the business entity. `Customer` names in database models, legacy API paths, and compatibility code refer to the same Rider; Rider Phone Number is the canonical key, never Rider Name.

Production-ready service request orchestration platform for WhatsApp-first customer support and coordinator-driven operations.

**Build workflow:** [GitHub Actions build pipeline](./.github/workflows/build.yml)

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [Docker Setup](#docker-setup)
- [Database Setup](#database-setup)
- [Prisma Commands](#prisma-commands)
- [Seed Commands](#seed-commands)
- [Running Tests](#running-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Overview](#api-overview)
- [Architecture Diagrams](#architecture-diagrams)
- [Database Overview](#database-overview)
- [Roadmap](#roadmap)
- [Version History](#version-history)
- [Source of Truth Documents](#source-of-truth-documents)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Project Overview

MSPL Assist is an enterprise SaaS support workflow designed for mobility operations where:

- customers initiate service requests through WhatsApp,
- coordinators continue operations through structured systems,
- backend services enforce business rules,
- auditability, workflow consistency, and traceability are mandatory.

Version 1 focuses on the backend service-request creation flow, master data APIs, conversation orchestration, test foundations, containerized local development, and CI validation.

## Problem Statement

Customer support operations often break down when service intake, verification, deployment lookup, and ticket creation are distributed across chat tools, spreadsheets, and manual processes. MSPL Assist addresses this by centralizing:

- customer conversation state,
- deployment verification,
- ticket creation business rules,
- audit trail creation,
- testable and repeatable operational workflows.

## Key Features

### Version 1.0.0

- Clean Architecture backend using Express, TypeScript, Prisma, and PostgreSQL
- Conversation Engine using State Pattern and handler orchestration
- Master data APIs for statuses, issue categories, hubs, and vehicle models
- Ticket creation API with business-rule enforcement
- Ticket number generation
- Audit trail creation with ticket history and ticket activity records
- Unit, integration, and API test suites
- Docker-based local development
- GitHub Actions build validation pipeline

### Planned next steps

- notification engine
- WhatsApp Cloud API delivery integration
- coordinator workflow extensions
- ticket tracking flow

## Architecture Overview

MSPL Assist follows Clean Architecture with strict separation of concerns:

- **Presentation Layer**: Express routes and controllers
- **Application Layer**: conversation handlers, services, orchestration
- **Domain/Data Access Layer**: repositories and DTOs
- **Infrastructure Layer**: Prisma, PostgreSQL, Docker, CI/CD

### Architecture summary

- controllers never own business logic,
- services own business rules,
- repositories own persistence access,
- validators own normalization and validation,
- handlers orchestrate conversation state transitions,
- mappers translate conversation context into DTOs.

## Technology Stack

| Area | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Frontend | React, TypeScript, Vite |
| Testing | Jest, ts-jest, Supertest |
| Dev Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Project Structure

```text
MSPL-Assist/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── conversations/
│   │   ├── database/
│   │   ├── dto/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── shared/
│   │   ├── tests/
│   │   ├── utils/
│   │   └── validators/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
├── docs/
├── frontend/
├── .github/
│   └── workflows/
└── docker-compose.yml
```

## Prerequisites

### Local (non-Docker)

- Node.js 20+
- npm 10+
- PostgreSQL 16+ compatible instance

### Containerized

- Docker Desktop or Docker Engine
- Docker Compose v2

## Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npm run build
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

## Environment Variables

### Backend application variables

| Name | Purpose | Default | Required | Example |
|---|---|---:|---|---|
| `DATABASE_URL` | Prisma Client's runtime connection string (pooled, e.g. Supabase Transaction Pooler in production) | none | Yes | `postgresql://mspl_user:mspl_password@localhost:5432/mspl_assist?schema=public` |
| `DIRECT_URL` | Direct (non-pooled) connection string used only by the Prisma CLI - `migrate`, `db push`, introspection. See `backend/.env.example` for why this is required alongside `DATABASE_URL`. | none | Yes | `postgresql://mspl_user:mspl_password@localhost:5432/mspl_assist?schema=public` |
| `PORT` | Backend HTTP port | `4000` | No | `4000` |
| `CONVERSATION_SESSION_TIMEOUT_HOURS` | Session expiry threshold | `24` | No | `24` |

### Docker Compose variables

| Name | Purpose | Default | Required | Example |
|---|---|---:|---|---|
| `POSTGRES_DB` | PostgreSQL database name | `mspl_assist` | No | `mspl_assist` |
| `POSTGRES_USER` | PostgreSQL username | `mspl_user` | No | `mspl_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `mspl_password` | No | `mspl_password` |
| `POSTGRES_PORT` | Published PostgreSQL port | `5432` | No | `5432` |
| `BACKEND_PORT` | Published backend port | `4000` | No | `4000` |
| `PGADMIN_DEFAULT_EMAIL` | pgAdmin login email | `admin@msplassist.local` | No | `admin@msplassist.local` |
| `PGADMIN_DEFAULT_PASSWORD` | pgAdmin login password | `admin123` | No | `admin123` |
| `PGADMIN_PORT` | Published pgAdmin port | `5050` | No | `5050` |

## Running the Backend

```bash
cd backend
npm run dev
```

Production-style local run:

```bash
cd backend
npm run build
npm run start
```

## Running the Frontend

```bash
cd frontend
npm run dev
```

Production build:

```bash
cd frontend
npm run build
```

## Docker Setup

### One-command local setup

From repository root:

```bash
docker compose up
```

This starts:

- PostgreSQL
- pgAdmin
- backend API with hot reload

### What happens automatically

- PostgreSQL starts with a persistent volume
- backend waits for PostgreSQL health
- Prisma migrations are deployed
- seed data is loaded
- backend starts in development mode
- backend health is checked through `GET /health`

### Development container files

- [`backend/Dockerfile.dev`](./backend/Dockerfile.dev) - local development container
- [`backend/Dockerfile`](./backend/Dockerfile) - production-oriented backend image
- [`docker-compose.yml`](./docker-compose.yml) - local orchestration

### Volumes

- `postgres_data` - PostgreSQL data persistence
- `pgadmin_data` - pgAdmin data persistence
- `backend_node_modules` - container dependency cache

### Health checks

- PostgreSQL: `pg_isready`
- pgAdmin: `/misc/ping`
- Backend: `GET /health`

### Common Docker commands

```bash
docker compose up --build
docker compose down
docker compose down -v
docker compose logs -f backend
docker compose logs -f postgres
```

### Production image build

```bash
docker build -f backend/Dockerfile -t mspl-assist-backend ./backend
```

## Database Setup

### Prisma generate

```bash
cd backend
npx prisma generate
```

### Apply migrations

```bash
cd backend
npx prisma migrate deploy
```

### Local migration workflow

```bash
cd backend
npx prisma migrate dev
```

## Prisma Commands

```bash
cd backend
npx prisma validate
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma studio
```

## Seed Commands

```bash
cd backend
npm run seed
```

Seed script:

- upserts status masters,
- upserts issue categories,
- upserts hubs,
- upserts vehicle models.

## Running Tests

### Backend test commands

```bash
cd backend
npm run test
npm run test:unit
npm run test:integration
npm run test:api
npm run test:coverage
npm run test:all
```

### Test categories

- **Unit tests**: isolated validator/service/handler/mapper/component verification
- **Integration tests**: cross-layer workflow validation
- **API tests**: endpoint behavior using Supertest

### Current combined coverage

Latest verified local combined coverage:

- Statements: **84.53%**
- Lines: **84.44%**
- Functions: **98.19%**
- Branches: **59.29%**

### Expected coverage guidance

- repository baseline target: **80%+** statements/lines/functions
- branch coverage baseline currently enforced separately where applicable

## CI/CD Pipeline

GitHub Actions workflow:

- [`./.github/workflows/build.yml`](./.github/workflows/build.yml)

### Pipeline stages

1. Checkout
2. Setup Node.js
3. Install backend dependencies
4. Install frontend dependencies
5. Prisma validate
6. Prisma generate
7. Backend build
8. Frontend build
9. Unit tests
10. Integration tests
11. API tests
12. Combined coverage
13. Coverage artifact upload

### Branch protection recommendations

- require pull requests before merge
- require the build workflow status check
- require branches to be up to date before merge
- dismiss stale approvals on new commits
- restrict direct pushes to the default branch

## API Overview

### Health API

#### `GET /health`

Returns service health metadata.

**Response example**

```json
{
  "status": "ok",
  "application": "MSPL Assist",
  "version": "1.0.0"
}
```

**Status codes**

- `200` - healthy

### Masters API

Base path: `GET /api/v1/masters`

#### `GET /api/v1/masters/statuses`

Returns active status masters ordered by display order.

#### `GET /api/v1/masters/issue-categories`

Returns active issue categories ordered by display order.

#### `GET /api/v1/masters/hubs`

Returns active hubs.

#### `GET /api/v1/masters/vehicle-models`

Returns active vehicle models.

**Response example**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Open",
      "displayOrder": 1,
      "customerVisible": false,
      "active": true,
      "createdAt": "2026-07-09T00:00:00.000Z",
      "updatedAt": "2026-07-09T00:00:00.000Z"
    }
  ]
}
```

**Status codes**

- `200` - success
- `500` - unexpected error

### Tickets API

#### `POST /api/v1/tickets`

Creates a new ticket or returns an existing active ticket.

**Request example**

```json
{
  "registeredMobile": "9876543210",
  "issueCategoryId": "issue-category-uuid",
  "issueDescription": "Battery drains quickly during rides",
  "source": "WHATSAPP",
  "priority": "MEDIUM",
  "sendUpdate": true,
  "mvTrackNumber": "deployment-reference",
  "vehicleNumber": "WB12AB1234"
}
```

**Success response example**

```json
{
  "success": true,
  "data": {
    "existingTicket": false,
    "ticketId": "ticket-uuid",
    "ticketNumber": "MV-090726-001",
    "createdAt": "2026-07-09T10:00:00.000Z"
  }
}
```

**Existing ticket response example**

```json
{
  "success": true,
  "data": {
    "existingTicket": true,
    "ticketNumber": "MV-090726-001",
    "currentStatus": "Open"
  }
}
```

**Status codes**

- `201` - new ticket created
- `200` - existing active ticket returned
- `400` - validation failure
- `404` - customer, issue category, or status not found
- `500` - unexpected failure

## Architecture Diagrams

### Overall architecture

```mermaid
flowchart LR
  Customer[Customer via WhatsApp] --> Conversation[Conversation Engine]
  Conversation --> Handlers[State Handlers]
  Handlers --> Validators[Validators]
  Handlers --> Services[Application Services]
  Services --> Repositories[Repositories]
  Repositories --> Prisma[Prisma ORM]
  Prisma --> Postgres[(PostgreSQL)]
  Services --> Audit[Ticket History / Ticket Activity]
  Coordinators[Coordinators / Operations] --> APILayer[REST APIs]
  APILayer --> Services
```

### Conversation flow

```mermaid
flowchart TD
  A[MAIN_MENU] --> B[WAITING_ISSUE_CATEGORY]
  B --> C[WAITING_ADD_MORE_ISSUES]
  C -->|Add more| B
  C -->|Continue| D[WAITING_ISSUE_DESCRIPTION]
  D --> E[WAITING_PHOTO]
  E --> F[WAITING_REGISTERED_MOBILE]
  F --> G[VERIFYING_CUSTOMER]
  G --> H[VERIFYING_DEPLOYMENT]
  H --> I[WAITING_TICKET_CREATION]
  I --> J[CONFIRMATION]
  J --> K[COMPLETED]
```

### Ticket creation flow

```mermaid
flowchart LR
  Context[Conversation Context] --> Mapper[ConversationTicketMapper]
  Mapper --> DTO[CreateTicketDto]
  DTO --> TicketService[TicketService.createTicket]
  TicketService --> Rule1[Active Ticket Check]
  TicketService --> Numbering[TicketNumberService]
  TicketService --> Repo[TicketRepository]
  Repo --> Ticket[(Ticket)]
  Repo --> IssueItems[(TicketIssueItem)]
  Repo --> History[(TicketHistory)]
  Repo --> Activity[(TicketActivity)]
```

### High-level database relationships

```mermaid
erDiagram
  CUSTOMER ||--o{ DEPLOYMENT : has
  CUSTOMER ||--o{ TICKET : creates
  DEPLOYMENT ||--o{ TICKET : supports
  ISSUECATEGORY ||--o{ TICKET : primary_issue
  STATUSMASTER ||--o{ TICKET : current_status
  TICKET ||--o{ TICKETISSUEITEM : contains
  TICKET ||--o{ TICKETHISTORY : tracks
  TICKET ||--o{ TICKETACTIVITY : logs
  CUSTOMER ||--o{ CONVERSATIONSESSION : participates
```

### Deployment architecture

```mermaid
flowchart TD
  Dev[Developer Workstation] --> Docker[Docker Compose]
  Docker --> BackendContainer[Backend Container]
  Docker --> PostgresContainer[PostgreSQL Container]
  Docker --> PgAdminContainer[pgAdmin Container]
  BackendContainer --> PrismaClient[Prisma Client]
  PrismaClient --> PostgresContainer
  GitHub[GitHub] --> Actions[GitHub Actions]
  Actions --> Artifact[Coverage Artifact]
```

### CI/CD pipeline

```mermaid
flowchart LR
  Checkout --> Node[Setup Node]
  Node --> Install[Install Dependencies]
  Install --> PrismaValidate[Prisma Validate]
  PrismaValidate --> PrismaGenerate[Prisma Generate]
  PrismaGenerate --> Build[TypeScript / Frontend Build]
  Build --> Unit[Unit Tests]
  Unit --> Integration[Integration Tests]
  Integration --> API[API Tests]
  API --> Coverage[Coverage Report]
  Coverage --> Artifact[Upload Artifact]
```

## Database Overview

Primary data groups:

- **Customer & Deployment**: customer identity and active rental/deployment details
- **Master Data**: statuses, issue categories, hubs, vehicle models
- **Ticketing**: tickets, issue items, comments, attachments, notification logs
- **Audit Trail**: ticket history and ticket activity
- **Conversation State**: active WhatsApp-linked session data

Relevant schema source:

- [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma)

## Roadmap

See:

- [`./ROADMAP.md`](./ROADMAP.md)
- [`./docs/15_Product_Backlog.md`](./docs/15_Product_Backlog.md)

## Version History

- [`./CHANGELOG.md`](./CHANGELOG.md)
- [`./RELEASE_NOTES.md`](./RELEASE_NOTES.md)

Current release: **1.0.0**

## Source of Truth Documents

Frozen documentation set:

- [`./docs/00_System_Blueprint.md`](./docs/00_System_Blueprint.md)
- [`./docs/01_Product_Requirements.md`](./docs/01_Product_Requirements.md)
- [`./docs/02_User_Personas.md`](./docs/02_User_Personas.md)
- [`./docs/03_User_Journeys.md`](./docs/03_User_Journeys.md)
- [`./docs/04_Business_Rules.md`](./docs/04_Business_Rules.md)
- [`./docs/05_Functional_Specification.md`](./docs/05_Functional_Specification.md)
- [`./docs/06_Database_Design.md`](./docs/06_Database_Design.md)
- [`./docs/07_Technical_Architecture.md`](./docs/07_Technical_Architecture.md)
- [`./docs/08_API_Specification.md`](./docs/08_API_Specification.md)
- [`./docs/09_Conversation_Engine.md`](./docs/09_Conversation_Engine.md)
- [`./docs/10_Workflow_Engine.md`](./docs/10_Workflow_Engine.md)
- [`./docs/11_Excel_Workspace.md`](./docs/11_Excel_Workspace.md)
- [`./docs/12_Notification_Engine.md`](./docs/12_Notification_Engine.md)
- [`./docs/13_Test_Strategy.md`](./docs/13_Test_Strategy.md)
- [`./docs/14_Deployment_Guide.md`](./docs/14_Deployment_Guide.md)
- [`./docs/15_Product_Backlog.md`](./docs/15_Product_Backlog.md)
- [`./docs/16_Architecture_Audit.md`](./docs/16_Architecture_Audit.md)
- [`./docs/99_Decision_Log.md`](./docs/99_Decision_Log.md)

## Contributing

Please read:

- [`./CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`./CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)

## License

This repository is licensed under the terms in [`./LICENSE`](./LICENSE).

## Support

For support, bug reports, security guidance, and contribution paths:

- [`./SUPPORT.md`](./SUPPORT.md)
- [`./SECURITY.md`](./SECURITY.md)
