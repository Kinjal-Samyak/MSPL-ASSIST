# MSPL Assist
# Technical Architecture

| Document | Technical Architecture |
|----------|------------------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Engineering Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document defines the technical architecture of MSPL Assist Version 1.

It specifies the backend structure, frontend structure, architectural patterns, coding standards, responsibilities, and interaction between all application components.

Every developer must follow this architecture.

---

# 2. Technology Stack

## Backend

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL

---

## Frontend

- React
- TypeScript
- Vite

---

## External Services

- WhatsApp Business API
- Microsoft Graph API
- Excel Online

---

## Version Control

Git

GitHub

---

# 3. Architectural Principles

The application follows:

- Clean Architecture
- SOLID Principles
- Repository Pattern
- Service Layer Pattern
- State Pattern
- DTO Pattern
- Dependency Injection Ready
- Transaction-safe Operations

---

# 4. High Level Architecture

```
                 WhatsApp

                     │

                     ▼

            Presentation Layer

                     │

                     ▼

            Application Layer

                     │

                     ▼

               Domain Layer

                     │

                     ▼

          Infrastructure Layer

                     │

                     ▼

                PostgreSQL
```

---

# 5. Backend Folder Structure

```
backend/

src/

config/

constants/

controllers/

conversations/

dto/

errors/

excel/

jobs/

middleware/

repositories/

routes/

services/

validators/

database/

notifications/

shared/

utils/

types/

app.ts

server.ts
```

---

# 6. Layer Responsibilities

## Presentation Layer

Responsible for:

- Routes
- Controllers
- Request Parsing
- Response Formatting

Must NOT contain business logic.

---

## Application Layer

Responsible for:

- Use Cases
- Service Orchestration
- Transaction Management

---

## Domain Layer

Responsible for:

- Business Rules
- Workflow Logic
- Validation Logic
- Conversation Logic

---

## Infrastructure Layer

Responsible for:

- Prisma
- PostgreSQL
- WhatsApp API
- Excel Integration
- Logging

---

# 7. Controllers

Controllers should be lightweight.

Responsibilities

- Receive Request
- Validate DTO
- Call Service
- Return Response

Controllers never communicate directly with Prisma.

---

Controllers

CustomerController

TicketController

ConversationController

NotificationController

HealthController

---

# 8. Services

Services contain business workflows.

Examples

TicketService

ConversationService

NotificationService

WorkflowService

TicketNumberService

PublishService

---

Service Rules

- Stateless
- Reusable
- Transaction Aware

---

# 9. Repositories

Repositories encapsulate database access.

Repositories never contain business rules.

Repositories

CustomerRepository

TicketRepository

MasterRepository

ConversationRepository

NotificationRepository

---

Responsibilities

- CRUD
- Transactions
- Prisma Queries
- Optimized Database Access

---

# 10. DTOs

Every request uses DTOs.

Examples

CreateTicketDto

UpdateTicketDto

PublishTicketDto

ConversationRequestDto

ConversationResponseDto

DTOs define application contracts.

---

# 11. Validators

Every incoming request is validated.

Validators

ticket-create.validator.ts

ticket-update.validator.ts

publish-update.validator.ts

conversation.validator.ts

Validation occurs BEFORE database transactions.

---

# 12. Error Handling

Application uses custom errors.

ApplicationError

ValidationError

ConflictError

NotFoundError

UnauthorizedError

InternalServerError

Errors return standardized API responses.

---

# 13. Logging

Application logs:

Errors

Warnings

Business Events

Performance

External API Failures

Logs must never expose sensitive customer information.

---

# 14. Configuration

Application configuration resides inside

config/

Examples

Database

WhatsApp

Microsoft Graph

Environment Variables

No configuration values are hardcoded.

---

# 15. Constants

Application constants reside in

constants/

Examples

Conversation Commands

Default Timeouts

Retry Counts

Supported File Types

Business constants that may change should be stored in database master tables instead.

---

# 16. Utilities

Utility functions

Date Formatting

Phone Normalization

Currency Formatting

UUID Helpers

Utilities must not contain business rules.

---

# 17. Conversation Engine

## Purpose

The Conversation Engine manages all customer interactions over WhatsApp.

It is responsible for:

- Starting conversations
- Resuming conversations
- Managing conversation states
- Collecting required information
- Creating or updating tickets
- Handling conversation expiry

Business rules remain outside the engine.

The engine only controls conversation flow.

---

## Components

ConversationController

↓

ConversationService

↓

ConversationEngine

↓

ConversationStateHandler

↓

ConversationRepository

---

## State Pattern

Each conversation state is implemented as an independent handler.

Examples

- MainMenuHandler
- ActiveTicketCheckHandler
- IssueSelectionHandler
- IssueDescriptionHandler
- PhotoUploadHandler
- MobileVerificationHandler
- ConfirmationHandler
- TrackTicketHandler

Each handler performs only one responsibility.

---

# 18. Workflow Engine

## Purpose

Controls the lifecycle of every ticket.

Responsible for:

- Status transitions
- ETA updates
- Charge updates
- Ticket closure validation
- Business workflow enforcement

Workflow Engine never communicates directly with WhatsApp.

---

Workflow

```

Open

↓

Assigned

↓

Inspection

↓

Repair In Progress

↓

Ready for Delivery

↓

Completed

↓

Closed

```

Only valid transitions are permitted.

---

# 19. Notification Engine

## Purpose

Generates customer notifications.

The Notification Engine is responsible for:

- Creating professional messages
- Replacing placeholders
- Recording notification history
- Sending WhatsApp messages
- Logging delivery status

The coordinator never writes customer-facing messages.

---

Notification Flow

```

Coordinator

↓

Publish Updates

↓

Notification Service

↓

Template Builder

↓

WhatsApp API

↓

Customer

↓

Notification Log

```

---

# 20. Excel Integration

## Purpose

Excel Online is the operational workspace.

Excel is never the source of truth.

---

Coordinator updates

- Status
- ETA
- Charges
- Notes
- Notify Customer

↓

Clicks

📤 Publish Updates

↓

Backend validates changes

↓

Database updated

↓

Optional notification sent

---

Excel never performs direct database updates.

All updates pass through backend services.

---

# 21. Transaction Management

The following operations execute inside a single database transaction.

Ticket Creation

Creates

- Ticket
- TicketIssueItems
- TicketHistory
- TicketActivity

If any step fails

↓

Rollback

---

Publish Updates

Updates

- Ticket
- TicketIssueItems
- TicketHistory
- TicketActivity
- NotificationLog

If any database operation fails

↓

Rollback

---

# 22. Dependency Rules

Controllers

↓

Services

↓

Repositories

↓

Database

Controllers must never call repositories directly.

Repositories must never call services.

Services may call multiple repositories.

---

# 23. Security Architecture

All requests pass through

Validation

↓

Authentication (Future)

↓

Authorization (Future)

↓

Business Validation

↓

Database

---

Application validates

- Required fields
- Mobile numbers
- Ticket numbers
- Status transitions
- Charges
- ETA

---

# 24. Performance Guidelines

Database queries should use indexes.

Avoid unnecessary joins.

Repositories should fetch only required columns.

Batch operations should use transactions.

Conversation responses should be returned within three seconds.

---

# 25. API Standards

Every API returns a consistent response.

Success

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Failure

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

No API should expose internal database details.

---

# 26. Coding Standards

## General

- TypeScript strict mode enabled.
- No `any` type.
- Single responsibility per class.
- Small reusable functions.
- Meaningful variable names.

---

## Controllers

Maximum responsibility:

- Receive request
- Call service
- Return response

---

## Services

Contain business workflows only.

---

## Repositories

Contain database access only.

---

## Validators

Contain validation only.

---

## DTOs

Contain data contracts only.

---

## Utilities

Contain reusable helper functions only.

---

# 27. Folder Ownership

| Folder | Responsibility |
|---------|---------------|
| controllers | HTTP endpoints |
| services | Business workflows |
| repositories | Database access |
| validators | Input validation |
| dto | Request / Response contracts |
| conversations | Conversation state engine |
| notifications | Notification generation |
| excel | Excel synchronization |
| middleware | Express middleware |
| config | Environment configuration |
| utils | Generic helper functions |
| database | Prisma client |
| errors | Custom error classes |
| routes | Route registration |

---

# 28. Scalability

The architecture is designed to support future additions without major restructuring.

Future modules may include:

- Technician Mobile App
- Customer Portal
- AI Assistant
- Inventory Management
- Warranty Management
- SLA Engine
- Power BI Reporting
- Multi-company Support

These modules should integrate through services without modifying the core architecture.

---

# 29. Architecture Rules

The following rules are mandatory.

- Business logic belongs only in Services.
- Database access belongs only in Repositories.
- Controllers remain thin.
- Business rules are defined in `04_Business_Rules.md`.
- Database structure is defined in `06_Database_Design.md`.
- No direct database access from UI components.
- Excel is never the source of truth.
- WhatsApp is only a communication channel.

---

# 30. References

- 00_System_Blueprint.md
- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 08_API_Specification.md
- 09_Conversation_Engine.md
- 10_Workflow_Engine.md
- 11_Excel_Workspace.md
- 12_Notification_Engine.md

---

# Approval

Status: APPROVED

This document defines the official technical architecture of MSPL Assist Version 1.

All implementation must follow this architecture.

No deviation is permitted without updating the Engineering Design Pack and recording the change in `99_Decision_Log.md`.