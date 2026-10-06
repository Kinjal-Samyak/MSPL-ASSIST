# MSPL Assist
# Workflow Engine

| Document | Workflow Engine |
|----------|-----------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Engineering Team |
| Last Updated | July 2026 |

---

# 1. Purpose

The Workflow Engine governs the lifecycle of every Service Ticket and every Ticket Issue Item.

It ensures:

- Valid status transitions
- Consistent business rules
- Audit logging
- Automatic workflow validation
- Ticket completion rules

The Workflow Engine is the only component allowed to change ticket and issue statuses.

---

# 2. Workflow Principles

- Every Ticket has one overall status.
- Every Ticket Issue Item has its own status.
- The Ticket status reflects the overall progress.
- Invalid transitions are rejected.
- Every status change creates a TicketHistory record.
- Every business action creates a TicketActivity record.
- Ticket closure is automatic only after all issue items are completed.

---

# 3. Ticket Workflow

```
Open
   │
   ▼
Assigned
   │
   ▼
Inspection
   │
   ▼
Repair In Progress
   │
   ▼
Ready for Delivery
   │
   ▼
Completed
   │
   ▼
Closed
```

---

# 4. Ticket Issue Workflow

Each Ticket Issue Item follows the same lifecycle independently.

```
Open
   │
   ▼
Assigned
   │
   ▼
Inspection
   │
   ▼
Repair In Progress
   │
   ▼
Completed
```

Issue Items do not enter the Closed status.

Only the Ticket itself is Closed.

---

# 5. Ticket Creation Workflow

When a new ticket is created:

- Generate Ticket Number
- Create Ticket
- Create first Ticket Issue Item
- Create TicketHistory
- Create TicketActivity

All operations occur inside a single transaction.

---

# 6. Active Ticket Validation

Before creating a ticket:

- Search for ACTIVE tickets for the customer.

If an active ticket exists:

- Do not create a new ticket.
- Offer the customer the option to append a new issue.

---

# 7. Append Issue Workflow

When a customer adds another issue:

- Validate ticket is active.
- Validate issue category is not already present.
- Assign next sequence number.
- Create TicketIssueItem.
- Create TicketActivity.
- Keep existing ticket open.

No new ticket is created.

---

# 8. Status Transition Rules

| Current Status | Allowed Next Status |
|----------------|---------------------|
| Open | Assigned |
| Assigned | Inspection |
| Inspection | Repair In Progress |
| Repair In Progress | Ready for Delivery |
| Ready for Delivery | Completed |
| Completed | Closed |

Any other transition is rejected.

---

# 9. Ticket Closure Rule

Before moving a ticket to Closed:

The system checks:

- Are all Ticket Issue Items in Completed status?

If YES:

- Close Ticket.

If NO:

- Reject the operation.

---

# 10. ETA Workflow

Coordinator may update ETA at any time.

Updating ETA:

- Updates Ticket.
- Creates TicketActivity.
- Does not create TicketHistory.

---

# 11. Charges Workflow

Coordinator may update:

- Estimated Charges
- Final Charges

Every update:

- Creates TicketActivity.

Status remains unchanged.

---

# 12. Notification Workflow

Coordinator decides whether to notify customer.

Workflow

Coordinator

↓

Update Ticket

↓

Notify Customer = TRUE

↓

📤 Publish Updates

↓

Backend validates

↓

Database updated

↓

Generate Message

↓

Send WhatsApp

↓

Create NotificationLog

↓

Reset Notify Customer = FALSE

---

# 13. Audit Workflow

Every workflow event creates TicketActivity.

Examples:

- Ticket Created
- Issue Added
- Status Changed
- ETA Updated
- Charges Updated
- Notification Published
- Ticket Closed

Status changes additionally create TicketHistory.

---

# 14. Failure Handling

If any database operation fails:

- Roll back transaction.
- Return error.
- Do not partially update data.

If WhatsApp delivery fails:

- Ticket update remains committed.
- NotificationLog records failure.
- Customer can be notified later.

---

# 15. Performance Requirements

- Ticket Creation < 2 seconds
- Status Update < 2 seconds
- Publish Updates < 5 seconds
- Workflow validation < 500 ms

---

# 16. Workflow Ownership

| Component | Responsibility |
|-----------|----------------|
| WorkflowService | Workflow orchestration |
| TicketService | Ticket operations |
| TicketRepository | Database persistence |
| NotificationService | Customer communication |
| ConversationEngine | Customer interaction |

---

# 17. References

- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 07_Technical_Architecture.md
- 09_Conversation_Engine.md

---

# Approval

Status: APPROVED

This document defines the official Workflow Engine for MSPL Assist Version 1.