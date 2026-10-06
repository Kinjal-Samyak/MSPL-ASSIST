# MSPL Assist
# User Journeys

| Document | User Journeys |
|----------|---------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Product Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document describes how each user interacts with MSPL Assist from start to finish.

Each journey represents a real business scenario.

These journeys are implementation references for:

- Conversation Engine
- Workflow Engine
- Notification Engine
- Excel Workspace

---

# 2. Customer Journey 1 - Register First Service Ticket

## Goal

Register a new service request.

### Flow

Customer

↓

Sends

```
Hi
```

↓

System displays Main Menu

↓

Customer selects

```
Register Service Issue
```

↓

System checks for active ticket

↓

No active ticket found

↓

Customer selects Issue Category

↓

Customer chooses additional issue categories (optional)

↓

Customer enters issue description

↓

Customer uploads photo or types SKIP

↓

Customer enters registered mobile number

↓

Customer verified

↓

Deployment lookup

↓

Ticket created

↓

Confirmation displayed

↓

Conversation completed

---

# 3. Customer Journey 2 - Existing Active Ticket

## Goal

Customer reports another issue while an active ticket already exists.

### Flow

Customer

↓

Register Service Issue

↓

Backend detects active ticket

↓

System displays

```
You already have an active ticket.

Ticket Number

Current Status

Would you like to add another issue?

1️⃣ Yes

2️⃣ No
```

↓

Customer selects Yes

↓

Issue category selection

↓

Issue description

↓

Optional photo

↓

Issue appended to existing ticket

↓

Confirmation

↓

Conversation completed

No new ticket is created.

---

# 4. Customer Journey 3 - Track Existing Ticket

Customer

↓

Selects

```
Track Existing Ticket
```

↓

System requests Ticket Number

↓

Customer enters Ticket Number

↓

System retrieves ticket

↓

Displays

- Ticket Number
- Primary Issue
- Overall Status
- ETA
- Issue Summary

↓

Conversation completed

---

# 5. Customer Journey 4 - Invalid Ticket Number

Customer enters an invalid ticket number.

System displays

```
Ticket not found.

Please verify your Ticket Number.
```

Conversation ends.

---

# 6. Customer Journey 5 - Invalid Mobile Number

Customer enters an invalid registered mobile number.

System displays

```
We could not verify your registered mobile number.

Please contact customer support.
```

Conversation ends.

---

# 7. Customer Journey 6 - Skip Photo

Customer selects

```
SKIP
```

Photo upload step is bypassed.

Ticket creation continues.

---

# 8. Customer Journey 7 - Conversation Resume

Customer stops responding.

Returns within 24 hours.

Conversation resumes from the last completed step.

No information is lost.

---

# 9. Customer Journey 8 - Conversation Expiry

Customer returns after 24 hours.

Previous session has expired.

System starts a new conversation.

---

# 10. Coordinator Journey 1 - Review Tickets

Coordinator opens Excel Online.

Reviews Tickets worksheet.

Views:

- New tickets
- Active tickets
- Closed tickets

No editing occurs.

---

# 11. Coordinator Journey 2 - Update Ticket

Coordinator edits

- Status
- ETA
- Charges
- Internal Notes

Notify Customer remains FALSE.

Clicks

```
📤 Publish Updates
```

Backend updates database.

No WhatsApp notification is sent.

---

# 12. Coordinator Journey 3 - Update Ticket and Notify Customer

Coordinator updates ticket.

Checks

```
Notify Customer
```

Clicks

```
📤 Publish Updates
```

Backend

↓

Validates changes

↓

Updates database

↓

Creates TicketHistory

↓

Creates TicketActivity

↓

Generates WhatsApp message

↓

Sends message

↓

Creates NotificationLog

↓

Resets Notify Customer

---

# 13. Coordinator Journey 4 - Update Issue

Coordinator opens Ticket Issues worksheet.

Updates

- Issue Status
- Charges
- Technician Notes

Publishes changes.

Workflow Engine recalculates Ticket Status if required.

---

# 14. Coordinator Journey 5 - Conflict

Another coordinator updates the same ticket.

Current coordinator attempts Publish.

Backend detects rowVersion mismatch.

Publish rejected.

Excel displays

```
Ticket has been modified.

Please refresh and try again.
```

---

# 15. Coordinator Journey 6 - Notification Failure

Ticket update succeeds.

WhatsApp API fails.

Database remains updated.

NotificationLog records Failed.

Coordinator may retry later.

---

# 16. System Journey 1 - Ticket Creation

Conversation Engine

↓

Ticket Service

↓

Ticket Number Service

↓

Ticket Repository

↓

Create Ticket

↓

Create TicketIssueItem

↓

Create TicketHistory

↓

Create TicketActivity

↓

Commit Transaction

---

# 17. System Journey 2 - Append Issue

Customer has active ticket.

Workflow

↓

Validate ticket

↓

Validate issue category

↓

Assign sequence number

↓

Create TicketIssueItem

↓

Create TicketActivity

↓

Commit

---

# 18. System Journey 3 - Close Ticket

Coordinator marks last remaining issue as Completed.

Workflow Engine checks

All issues completed?

↓

YES

↓

Ticket moves to Completed

↓

Coordinator reviews

↓

Moves ticket to Closed

↓

Customer notified (optional)

---

# 19. System Journey 4 - Publish Updates

Coordinator clicks

```
📤 Publish Updates
```

↓

Validation

↓

Database Commit

↓

Notification Generation

↓

WhatsApp

↓

Notification Log

↓

Success Response

---

# 20. System Journey 5 - Automatic Audit

Every business event creates:

- TicketActivity

Status changes additionally create:

- TicketHistory

Customer notifications create:

- NotificationLog

Audit history is immutable.

---

# 21. Journey Summary

| Journey | Actor | Outcome |
|----------|-------|---------|
| Register First Ticket | Customer | Ticket Created |
| Add Issue | Customer | Issue Appended |
| Track Ticket | Customer | Status Displayed |
| Resume Conversation | Customer | Session Continued |
| Publish Update | Coordinator | Database Updated |
| Notify Customer | Coordinator | WhatsApp Sent |
| Update Issue | Coordinator | Issue Updated |
| Close Ticket | Coordinator | Ticket Closed |
| Automatic Audit | System | History Recorded |

---

# References

- 04_Business_Rules.md
- 05_Functional_Specification.md
- 09_Conversation_Engine.md
- 10_Workflow_Engine.md
- 11_Excel_Workspace.md
- 12_Notification_Engine.md

---

# Approval

Status: APPROVED

This document defines the official user journeys for MSPL Assist Version 1.