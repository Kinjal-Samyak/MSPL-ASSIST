# MSPL Assist
# Database Design

| Document | Database Design |
|----------|-----------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Product Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document defines the database architecture of MSPL Assist Version 1.

It is the authoritative reference for:

- Database schema
- Table definitions
- Relationships
- Constraints
- Indexes
- Audit strategy
- Master data
- Data integrity rules

No database changes shall be made without updating this document.

---

# 2. Database Technology

| Item | Value |
|------|-------|
| Database | PostgreSQL |
| ORM | Prisma |
| Primary Key | UUID |
| Time Zone | UTC |
| Soft Delete | Supported |
| Transactions | Required |
| Optimistic Locking | Supported using rowVersion |

---

# 3. Design Principles

## DB-001

PostgreSQL is the single source of truth.

---

## DB-002

No business logic exists inside the database.

Business logic belongs to the backend.

---

## DB-003

Master data shall be normalized.

---

## DB-004

Historical records must never be deleted.

---

## DB-005

Every business event must be auditable.

---

## DB-006

All write operations must occur inside transactions.

---

## DB-007

Every table must contain audit timestamps unless explicitly excluded.

---

# 4. Entity Relationship Diagram

```text
Customer
    │
    ├───────────────┐
    │               │
    ▼               ▼
Deployment       Ticket
                     │
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 TicketIssueItem           TicketHistory
         │                       │
         ▼                       ▼
 IssueCategory           StatusMaster

Ticket
 │
 ├────────► TicketActivity
 │
 ├────────► NotificationLog
 │
 └────────► TicketComment

User
 │
 ├────────► Ticket
 ├────────► TicketHistory
 └────────► TicketActivity

ConversationSession

Hub

VehicleModel
```

---

# 5. Naming Standards

| Standard | Rule |
|----------|------|
| Tables | Singular |
| Primary Key | id |
| Foreign Key | entityId |
| Date Columns | camelCase |
| Audit Columns | createdAt, updatedAt |
| Soft Delete | deletedAt |
| Versioning | rowVersion |

---

# 6. Common Columns

Unless stated otherwise, all business tables contain:

| Column | Type |
|---------|------|
| id | UUID |
| createdAt | DateTime |
| updatedAt | DateTime |

Master tables additionally contain:

| Column | Type |
|---------|------|
| deletedAt | DateTime? |

---

# 7. Customer

Purpose

Stores master customer information.

## Columns

| Column | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| name | String | Customer Name |
| registeredMobile | String | Registered Mobile |
| alternateMobile | String | Optional Alternate Mobile |
| whatsAppNumber | String | WhatsApp Number |
| email | String | Optional Email |
| address | String | Optional Address |
| status | Enum | Customer Status |
| createdAt | DateTime | Audit |
| updatedAt | DateTime | Audit |

Indexes

- registeredMobile
- email
- status

Relationships

Customer

1

↓

Many

Deployment

Customer

1

↓

Many

Ticket

---

# 8. User

Purpose

Stores system users.

Supports

- Admin
- Coordinator
- Technician (Future)

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| name | String |
| email | String |
| mobile | String |
| role | Enum |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- email (Unique)
- mobile

Relationships

User

1

↓

Many

Ticket

User

1

↓

Many

TicketActivity

User

1

↓

Many

TicketHistory

---

# 9. Hub

Purpose

Master list of service hubs.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| name | String |
| active | Boolean |
| deletedAt | DateTime? |
| createdAt | DateTime |
| updatedAt | DateTime |

---

# 10. VehicleModel

Purpose

Master list of vehicle models.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| name | String |
| manufacturer | String |
| active | Boolean |
| deletedAt | DateTime? |
| createdAt | DateTime |
| updatedAt | DateTime |

---

# 11. Deployment

Purpose

Stores customer deployment information.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| customerId | UUID |
| hubId | UUID |
| vehicleModelId | UUID |
| mvTrackNumber | String |
| vehicleNumber | String |
| rentalStatus | Enum |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- customerId
- mvTrackNumber
- vehicleNumber

Relationships

Deployment

Many

↓

One

Customer

Deployment

Many

↓

One

Hub

Deployment

Many

↓

One

VehicleModel
---

# 12. IssueCategory

## Purpose

Stores the master list of service issue categories.

Issue Categories are configurable and must never be hardcoded.

Examples:

- Battery
- Charging
- Brake
- Tyre / Puncture
- Motor
- Throttle / Acceleration
- Accident
- Other

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| name | String |
| displayOrder | Int |
| active | Boolean |
| deletedAt | DateTime? |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- name (Unique)
- displayOrder

Relationships

IssueCategory

1

↓

Many

TicketIssueItem

---

# 13. StatusMaster

## Purpose

Stores all ticket statuses.

Statuses are configurable and not hardcoded.

Version 1 Statuses

- Open
- Assigned
- Inspection
- Repair In Progress
- Ready for Delivery
- Completed
- Closed

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| name | String |
| displayOrder | Int |
| customerVisible | Boolean |
| active | Boolean |
| deletedAt | DateTime? |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- name (Unique)

Relationships

StatusMaster

1

↓

Many

Ticket

StatusMaster

1

↓

Many

TicketIssueItem

StatusMaster

1

↓

Many

TicketHistory

---

# 14. Ticket

## Purpose

Represents one customer service case.

A customer may have only ONE active ticket.

A ticket may contain multiple Ticket Issue Items.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| ticketNumber | String |
| customerId | UUID |
| deploymentId | UUID? |
| assignedUserId | UUID? |
| primaryIssueCategoryId | UUID |
| currentStatusId | UUID |
| eta | DateTime? |
| estimatedCharges | Decimal? |
| finalCharges | Decimal? |
| deploymentVerified | Boolean |
| sendUpdate | Boolean |
| notificationStatus | String? |
| lastPublishedAt | DateTime? |
| lastPublishedBy | UUID? |
| rowVersion | Int |
| closedAt | DateTime? |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- ticketNumber (Unique)
- customerId
- currentStatusId
- deploymentId

Relationships

Ticket

Many

↓

One

Customer

Ticket

Many

↓

One

Deployment

Ticket

Many

↓

One

StatusMaster

Ticket

Many

↓

One

IssueCategory (Primary Issue)

Ticket

1

↓

Many

TicketIssueItem

Ticket

1

↓

Many

TicketHistory

Ticket

1

↓

Many

TicketActivity

Ticket

1

↓

Many

NotificationLog

Ticket

1

↓

Many

TicketComment

---

# 15. TicketIssueItem

## Purpose

Represents an individual issue within a Ticket.

A Ticket contains one or more Ticket Issue Items.

Each Issue Item has its own lifecycle.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| ticketId | UUID |
| sequenceNo | Int |
| issueCategoryId | UUID |
| description | Text |
| currentStatusId | UUID |
| estimatedCharges | Decimal? |
| finalCharges | Decimal? |
| technicianNotes | Text? |
| completedAt | DateTime? |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- ticketId
- issueCategoryId
- currentStatusId

Constraints

- sequenceNo must be unique within a ticket.
- issueCategoryId must be unique within a ticket.

Relationships

TicketIssueItem

Many

↓

One

Ticket

TicketIssueItem

Many

↓

One

IssueCategory

TicketIssueItem

Many

↓

One

StatusMaster

---

# 16. TicketComment

## Purpose

Stores coordinator comments.

Comments are internal only.

Customers never see these.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| ticketId | UUID |
| userId | UUID |
| comment | Text |
| createdAt | DateTime |

Indexes

- ticketId

---

# 17. NotificationLog

## Purpose

Stores every outbound customer notification.

Every notification attempt must be recorded.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| ticketId | UUID |
| channel | String |
| message | Text |
| status | String |
| responseId | String? |
| sentAt | DateTime |
| createdAt | DateTime |

Indexes

- ticketId
- status

---

# 18. TicketHistory

## Purpose

Stores ticket status transitions.

History cannot be edited.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| ticketId | UUID |
| oldStatusId | UUID |
| newStatusId | UUID |
| updatedBy | UUID |
| remarks | Text? |
| updatedAt | DateTime |
| createdAt | DateTime |

Indexes

- ticketId
- updatedAt

---

# 19. TicketActivity

## Purpose

Stores every business event.

Examples

- Ticket Created
- Issue Added
- Status Updated
- Charges Updated
- ETA Updated
- Notification Published
- Ticket Closed

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| ticketId | UUID |
| activityType | String |
| description | Text |
| metadata | JSON |
| performedBy | UUID? |
| performedAt | DateTime |
| createdAt | DateTime |

Indexes

- ticketId
- performedAt

---

# 20. ConversationSession

## Purpose

Maintains customer conversation state.

Supports conversation resume.

Supports 24-hour expiry.

## Columns

| Column | Type |
|---------|------|
| id | UUID |
| whatsappNumber | String |
| customerId | UUID? |
| currentTicketId | UUID? |
| currentState | String |
| conversationData | JSON |
| lastInteractionAt | DateTime |
| expiresAt | DateTime |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes

- whatsappNumber
- currentState
- expiresAt

---

# 21. Relationship Summary

| Parent | Child | Relationship |
|----------|-------|--------------|
| Customer | Deployment | 1 : Many |
| Customer | Ticket | 1 : Many |
| Ticket | TicketIssueItem | 1 : Many |
| Ticket | TicketHistory | 1 : Many |
| Ticket | TicketActivity | 1 : Many |
| Ticket | NotificationLog | 1 : Many |
| Ticket | TicketComment | 1 : Many |
| IssueCategory | TicketIssueItem | 1 : Many |
| StatusMaster | Ticket | 1 : Many |
| StatusMaster | TicketIssueItem | 1 : Many |
| User | Ticket | 1 : Many |
| User | TicketActivity | 1 : Many |
| User | TicketHistory | 1 : Many |

---

# 22. Data Integrity Rules

- One customer may have only one ACTIVE ticket.
- A ticket must contain at least one Ticket Issue Item.
- Duplicate Issue Categories are not allowed within the same ticket.
- The first Issue Category becomes the Primary Issue.
- A ticket cannot be Closed until every Ticket Issue Item is Completed.
- Ticket Numbers are immutable.
- Ticket History is immutable.
- Notification Logs are immutable.
- All writes occur inside database transactions.

---

# 23. Optimistic Locking

The Ticket table uses:

rowVersion

Every successful update increments rowVersion.

Conflicting updates must be rejected by the application.

---

# 24. Audit Strategy

Every business event creates:

- TicketHistory
- TicketActivity

Every customer notification creates:

- NotificationLog

Audit records must never be edited or deleted.

---

# 25. Database Freeze

The Version 1 schema defined in this document is frozen.

No tables, columns, relationships, or constraints may be changed without updating this document and recording the change in `99_Decision_Log.md`.

---

# References

- 00_System_Blueprint.md
- 04_Business_Rules.md
- 05_Functional_Specification.md
- 07_Technical_Architecture.md

---

# Approval

Status: APPROVED

This document defines the official database contract for MSPL Assist Version 1.