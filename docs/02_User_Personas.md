# MSPL Assist
# User Personas

| Document | User Personas |
|----------|---------------|
| Version | 1.0 |
| Status | Approved |
| Owner | Product Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document defines the primary users of the MSPL Assist platform.

Understanding each user helps ensure that product decisions focus on solving real operational problems rather than adding unnecessary complexity.

Every feature developed for MSPL Assist must provide value to at least one user persona.

---

# 2. User Groups

Version 1 supports three primary user groups.

1. Customer
2. Service Coordinator
3. Operations Manager

Future versions will introduce additional personas including Technicians, Administrators, and Business Owners.

---

# Persona 1 - Customer

## Persona ID

UP-001

## Description

A customer who has rented a vehicle from MSPL Rentals and requires assistance due to a service-related issue.

The customer is not expected to have technical knowledge of the vehicle or the service process.

The interaction should be simple, fast, and require minimal effort.

---

## Primary Goals

- Report a vehicle problem.
- Receive quick acknowledgement.
- Track ticket progress.
- Receive updates without repeatedly calling support.
- Get the vehicle repaired as quickly as possible.

---

## Frustrations

- Doesn't know whom to contact.
- Has to explain the problem repeatedly.
- No visibility into ticket status.
- Delayed responses.
- Multiple follow-up calls.
- No confirmation that the complaint was registered.

---

## Success Criteria

The customer should be able to:

- Register a service issue in less than two minutes.
- Receive an acknowledgement immediately.
- Track ticket status at any time.
- Receive proactive updates.

---

## Permissions

Allowed to:

- Register a Service Issue.
- Track Existing Ticket.
- Upload Images.
- Resume Conversation.
- Receive Notifications.

Not Allowed to:

- Modify ticket details.
- Change status.
- Change ETA.
- Change charges.
- View internal notes.

---

# Persona 2 - Service Coordinator

## Persona ID

UP-002

## Description

The Service Coordinator manages incoming service tickets and communicates progress to customers.

The coordinator spends most of the day updating ticket information and coordinating with operations.

The software should eliminate repetitive work and automate customer communication.

---

## Primary Goals

- Quickly review new tickets.
- Update service progress.
- Update ETA.
- Record charges.
- Notify customers.
- Maintain accurate records.

---

## Frustrations

- Manual WhatsApp communication.
- Repetitive typing.
- Maintaining multiple spreadsheets.
- Duplicate customer follow-ups.
- Lack of ticket history.
- Difficulty tracking outstanding work.

---

## Success Criteria

The coordinator should be able to:

- Update a ticket in under 30 seconds.
- Publish updates with one click.
- Never manually type customer messages.
- Easily identify pending work.

---

## Permissions

Allowed to:

- View tickets.
- Update status.
- Update ETA.
- Update estimated charges.
- Update final charges.
- Add internal notes.
- Publish customer updates.

Not Allowed to:

- Modify system configuration.
- Delete tickets.
- Edit audit history.
- Change ticket numbers.

---

# Persona 3 - Operations Manager

## Persona ID

UP-003

## Description

The Operations Manager oversees service operations across all hubs.

Their focus is operational efficiency, customer satisfaction, and business performance.

---

## Primary Goals

- Monitor service performance.
- Review ticket trends.
- Measure turnaround time.
- Identify operational bottlenecks.
- Improve service quality.
- Monitor workload.

---

## Frustrations

- No centralized reporting.
- Limited visibility into operations.
- Manual report preparation.
- Difficulty measuring team performance.
- Lack of historical data.

---

## Success Criteria

The Operations Manager should have access to reliable operational data that supports decision-making.

---

## Permissions

Allowed to:

- View reports.
- Monitor ticket statistics.
- Review service performance.
- Access dashboards.

Not Allowed to:

- Edit customer conversations.
- Modify ticket history.
- Delete audit records.

---

# Future Persona - Technician

## Persona ID

UP-004

## Status

Version 2

---

### Responsibilities

- Receive assigned jobs.
- Update repair progress.
- Upload repair photos.
- Mark repair completion.
- Record spare parts used.

---

# Future Persona - System Administrator

## Persona ID

UP-005

## Status

Version 2

---

### Responsibilities

- Manage users.
- Configure master data.
- Configure issue categories.
- Configure ticket statuses.
- Configure notification templates.
- Configure hubs.
- Configure vehicle models.

---

# Common Design Principles

The following principles apply to every user:

## DP-001

Users should only see information relevant to their role.

---

## DP-002

The system should minimize manual effort.

---

## DP-003

Users should never enter the same information twice.

---

## DP-004

The platform should automatically generate repetitive content whenever possible.

---

## DP-005

The backend remains the single source of truth.

---

# User Experience Goals

| User | Primary Goal | Success Measure |
|------|--------------|-----------------|
| Customer | Register issue quickly | < 2 minutes |
| Coordinator | Update ticket quickly | < 30 seconds |
| Operations Manager | View operational insights | Real-time visibility |

---

# Summary

MSPL Assist is designed around three primary user groups:

- Customers who need a simple and transparent way to report service issues.
- Service Coordinators who need an efficient operational workspace with minimal manual effort.
- Operations Managers who require complete visibility into service performance.

Future versions will expand the platform to include Technicians and System Administrators without changing the core architecture.

---

# References

This document should be read together with:

- 00_System_Blueprint.md
- 01_Product_Requirements.md
- 03_User_Journeys.md
- 04_Business_Rules.md

---

# Approval

Status: APPROVED

This document defines the official user personas for MSPL Assist Version 1.