# MSPL Assist
# System Blueprint

| Document | System Blueprint |
|----------|------------------|
| Version | 1.0 |
| Status | Approved (Version 1 Frozen) |
| Owner | Product Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document defines the overall vision, architecture, principles, and operating model of the MSPL Assist platform.

It acts as the master reference for all engineering, product, and implementation decisions.

Every document in the Engineering Design Pack (EDP) references this document.

---

# 2. Vision

MSPL Assist is an enterprise-grade Service Operations Platform designed to simplify customer support, service ticket management, and operational workflows for rental vehicles.

The first interaction channel is WhatsApp.

The long-term vision is to support multiple interaction channels while keeping all business logic centralized within the backend platform.

The platform should reduce customer effort, reduce coordinator effort, and increase operational visibility.

---

# 3. Product Vision

MSPL Assist is not a WhatsApp chatbot.

It is a Service Operations Platform.

WhatsApp is only one communication channel.

Excel Online is only a coordinator workspace.

PostgreSQL is the single source of truth.

All business rules are owned by the backend.

---

# 4. Product Goals

The platform must:

- Allow customers to register service issues easily.
- Automatically create service tickets.
- Standardize service workflows.
- Minimize manual data entry.
- Provide complete audit history.
- Provide automatic customer communication.
- Enable operational reporting.
- Be scalable and modular.

---

# 5. Core Principles

## SP-001

Customer should perform the minimum possible work.

---

## SP-002

Coordinator should perform the minimum possible work.

---

## SP-003

Software should perform the maximum possible work.

---

## SP-004

Never ask the customer for information already available in the system.

---

## SP-005

Never ask the coordinator to type information that can be generated automatically.

---

## SP-006

Backend is the single source of truth.

---

## SP-007

Business logic must never exist inside the UI.

---

## SP-008

Configuration is preferred over hardcoded values.

---

## SP-009

Every business action must create an audit trail.

---

## SP-010

Every customer interaction must be traceable.

---

## SP-011

Every workflow must be recoverable.

---

## SP-012

Every notification must be logged.

---

# 6. High-Level Architecture

```
                        Customer
                           │
                           ▼
                      WhatsApp
                           │
                           ▼
                  Interaction Layer
                           │
                           ▼
                Conversation Engine
                           │
                           ▼
                  Workflow Engine
                           │
                           ▼
                    Ticket Engine
                           │
                           ▼
                 Business Services
                           │
                           ▼
                     PostgreSQL
                     (Source of Truth)
                     /             \
                    /               \
                   ▼                 ▼
          Excel Online         Notification Engine
          Workspace                  │
                                     ▼
                              WhatsApp Customer
```

---

# 7. Layered Architecture

## Interaction Layer

Responsible for customer interactions.

Examples:

- WhatsApp
- Future Mobile App
- Future Website
- Future API

No business logic exists here.

---

## Application Layer

Coordinates business use cases.

Examples:

- Register Ticket
- Publish Updates
- Track Ticket
- Resume Conversation

This layer orchestrates services.

---

## Domain Layer

Contains all business rules.

Examples:

- Ticket Lifecycle
- Workflow Rules
- Status Validation
- Ticket Number Generation

Business rules exist only here.

---

## Infrastructure Layer

Responsible for technology implementation.

Examples:

- PostgreSQL
- Prisma
- Excel Online
- WhatsApp API
- Logging

---

# 8. Core Product Modules

Version 1 contains the following modules.

## Interaction Engine

Handles all incoming customer requests.

---

## Conversation Engine

Controls conversation flow.

Supports:

- Resume Conversation
- Session Expiry
- Conversation State Management

---

## Ticket Engine

Creates and manages tickets.

Responsible for:

- Ticket Creation
- Ticket Retrieval
- Ticket Search

---

## Workflow Engine

Controls ticket lifecycle.

Responsible for:

- Status Changes
- ETA Updates
- Charge Updates
- Ticket Closure

---

## Notification Engine

Generates customer communication.

Responsible for:

- WhatsApp Updates
- Notification History
- Publish Updates

---

## Excel Workspace

Coordinator workspace.

Allows:

- Status Updates
- ETA Updates
- Charges
- Notes
- Publish Updates

Excel never owns business logic.

---

## Audit Engine

Records every business action.

Examples:

- Ticket Created
- Status Updated
- Charges Updated
- Notification Sent

---

# 9. Core Users

## Customer

Can:

- Register Service Issue
- Track Ticket
- Upload Images
- Receive Notifications

---

## Coordinator

Can:

- Update Ticket Status
- Update ETA
- Update Charges
- Add Internal Notes
- Publish Updates

---

## Operations Manager

Can:

- Monitor Operations
- Review Reports
- Track Ticket Volumes
- Review SLA Performance

---

# 10. Version 1 Scope

## Included

- WhatsApp Customer Interface
- Ticket Management
- Workflow Management
- Conversation Management
- Notification Management
- Excel Workspace
- PostgreSQL Database
- Audit Trail

---

## Excluded

- AI Assistant
- Customer Portal
- Technician App
- Power BI
- Inventory Management
- Warranty
- Multi-language
- GPS Integration

These belong to Version 2 and beyond.

---

# 11. Engineering Principles

The project follows:

- Clean Architecture
- SOLID Principles
- Repository Pattern
- Service Layer Pattern
- State Pattern
- DTO Pattern
- Transactional Database Operations
- Strong TypeScript Typing

---

# 12. Source of Truth

| Component | Owns |
|-----------|------|
| PostgreSQL | Business Data |
| Backend | Business Rules |
| Excel Online | Coordinator Workspace |
| WhatsApp | Customer Communication |

Only PostgreSQL owns operational data.

---

# 13. Non-Functional Requirements

## Performance

- Ticket creation < 2 seconds
- Status update < 2 seconds
- Conversation response < 3 seconds

---

## Reliability

- No duplicate ticket numbers.
- Transaction-safe operations.
- Automatic rollback on failure.

---

## Scalability

The platform must support:

- Multiple hubs
- Multiple coordinators
- Thousands of customers
- Future communication channels

without redesign.

---

## Security

- Server-side validation.
- Input sanitization.
- Audit logging.
- Role-based security (future).

---

# 14. Product Success Metrics

The platform is successful when:

- Customers register tickets in under 2 minutes.
- Coordinators update tickets in under 30 seconds.
- All customer notifications are logged.
- No manual database updates are required.
- Every ticket has a complete audit history.
- Management has visibility into operations.

---

# 15. Future Vision

The platform is designed to evolve into a complete Fleet Service Management Platform.

Future modules include:

- AI Support Assistant
- Customer Portal
- Technician Mobile App
- Inventory Management
- Warranty Management
- SLA Automation
- Power BI Analytics
- GPS Integration
- Multi-company Support
- Predictive Maintenance

The Version 1 architecture must not prevent future expansion.

---

# 16. Document References

This document is the parent document for:

- 01_Product_Requirements.md
- 02_User_Personas.md
- 03_User_Journeys.md
- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 07_Technical_Architecture.md
- 08_API_Specification.md
- 09_Conversation_Engine.md
- 10_Workflow_Engine.md
- 11_Excel_Workspace.md
- 12_Notification_Engine.md
- 13_Test_Strategy.md
- 14_Deployment_Guide.md
- 15_Product_Backlog.md
- 99_Decision_Log.md

---

# Approval

Status: APPROVED

This document establishes the architectural vision of MSPL Assist Version 1.

No implementation should violate the principles defined in this document.

Future architectural changes must be recorded in `99_Decision_Log.md`.