# MSPL Assist
# Decision Log

| Document | Decision Log |
|----------|--------------|
| Version | 1.0 |
| Status | APPROVED |
| Last Updated | July 2026 |

---

# Purpose

This document records all approved architectural and business decisions.

Once recorded here, a decision is considered frozen unless formally revised.

---

# ADR-001

## Title

Technology Stack

### Decision

Use:

- React
- TypeScript
- Vite
- Node.js
- Express
- PostgreSQL
- Prisma

### Status

Approved

---

# ADR-002

## Title

Excel as Coordinator Workspace

### Decision

Excel Online will be the operational interface.

PostgreSQL remains the source of truth.

### Status

Approved

---

# ADR-003

## Title

One Active Ticket Per Customer

### Decision

A customer may have only one active ticket at a time.

If an active ticket exists, the system offers to append new issues instead of creating another ticket.

### Status

Approved

---

# ADR-004

## Title

Multiple Issues Per Ticket

### Decision

A Ticket may contain multiple Ticket Issue Items.

Each Issue Item has an independent lifecycle.

The Ticket closes only after all Issue Items are completed.

### Status

Approved

---

# ADR-005

## Title

Primary Issue

### Decision

The first Issue Category selected becomes the Primary Issue.

Primary Issue is used for reporting, dashboards, and customer summaries.

### Status

Approved

---

# ADR-006

## Title

Conversation Session Management

### Decision

Conversation sessions are maintained for 24 hours.

START, RESET, and NEW commands create a new session.

### Status

Approved

---

# ADR-007

## Title

Conversation Engine Architecture

### Decision

Use the State Pattern.

Each conversation state has an independent handler.

### Status

Approved

---

# ADR-008

## Title

Backend Architecture

### Decision

Adopt Clean Architecture with:

- Controllers
- Services
- Repositories
- DTOs
- Validators

Business logic resides only in Services.

### Status

Approved

---

# ADR-009

## Title

Notification Workflow

### Decision

Customer notifications are generated only when:

- Notify Customer = TRUE
- Coordinator clicks 📤 Publish Updates

Messages are generated automatically.

### Status

Approved

---

# ADR-010

## Title

Database Source of Truth

### Decision

PostgreSQL is the only source of truth.

Excel is an operational interface only.

### Status

Approved

---

# ADR-011

## Title

Audit Strategy

### Decision

Every business event creates a TicketActivity record.

Every status transition creates a TicketHistory record.

Every notification creates a NotificationLog record.

Audit records are immutable.

### Status

Approved

---

# ADR-012

## Title

Optimistic Concurrency

### Decision

Ticket updates use rowVersion to detect concurrent modifications.

Conflicting updates are rejected.

### Status

Approved

---

# ADR-013

## Title

Version 1 Freeze

### Decision

The following are frozen for Version 1:

- Business Rules
- Database Schema
- Technical Architecture
- Conversation Flow
- Workflow Engine
- Notification Engine
- Excel Workspace

Any future change must be documented and approved before implementation.

### Status

Approved

---

# Change Control

Any proposed change must include:

- Business justification
- Technical impact
- Database impact
- API impact
- Documentation update
- Product Owner approval

---

# Approval

Status: APPROVED

This document is the official record of architectural and business decisions for MSPL Assist Version 1.