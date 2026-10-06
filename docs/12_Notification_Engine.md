# MSPL Assist
# Notification Engine

| Document | Notification Engine |
|----------|---------------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Engineering Team |
| Last Updated | July 2026 |

---

# 1. Purpose

The Notification Engine is responsible for generating, sending, and logging all customer communications.

Version 1 supports WhatsApp as the only outbound communication channel.

The Notification Engine ensures that all customer messages are:

- Professional
- Consistent
- Automatically generated
- Fully auditable

Coordinators never manually compose customer-facing messages.

---

# 2. Objectives

The Notification Engine shall:

- Generate customer messages automatically.
- Replace placeholders with live ticket information.
- Send WhatsApp notifications.
- Record every notification attempt.
- Record delivery status.
- Prevent duplicate notifications.
- Support future notification channels.

---

# 3. Design Principles

- Backend generates every customer message.
- Coordinators approve sending by selecting **Notify Customer** and clicking **📤 Publish Updates**.
- Customer communication is standardized.
- Notification failures never rollback successful ticket updates.
- Every notification is logged.

---

# 4. Notification Workflow

```
Coordinator

↓

Update Ticket

↓

Notify Customer = TRUE

↓

📤 Publish Updates

↓

Workflow Validation

↓

Database Commit

↓

Generate Notification

↓

Send WhatsApp

↓

Create Notification Log

↓

Reset Notify Customer = FALSE
```

---

# 5. Notification Trigger

A notification is generated only when all conditions are true:

- Ticket update is successful.
- Notify Customer = TRUE.
- Coordinator clicks **📤 Publish Updates**.

If any condition is false, no customer notification is generated.

---

# 6. Notification Channels

Version 1

| Channel | Supported |
|----------|-----------|
| WhatsApp | ✅ |
| SMS | ❌ |
| Email | ❌ |
| Push Notification | ❌ |

Future versions may support additional channels.

---

# 7. Message Generation

Messages are created automatically by the backend.

The coordinator never edits or types customer messages.

Messages use predefined templates and dynamic placeholders.

---

# 8. Placeholder Variables

Supported placeholders:

| Placeholder | Description |
|-------------|-------------|
| {{CustomerName}} | Customer Name |
| {{TicketNumber}} | Ticket Number |
| {{PrimaryIssue}} | Primary Issue |
| {{OverallStatus}} | Current Ticket Status |
| {{ETA}} | Estimated Completion Time |
| {{EstimatedCharges}} | Estimated Charges |
| {{FinalCharges}} | Final Charges |
| {{Hub}} | Service Hub |
| {{VehicleNumber}} | Vehicle Number |

---

# 9. Notification Templates

## 9.1 Ticket Created

```
Hello {{CustomerName}},

Your service request has been successfully registered.

Ticket Number:
{{TicketNumber}}

Primary Issue:
{{PrimaryIssue}}

Our service coordinator will review your request shortly.

Thank you for choosing MSPL Rentals.
```

---

## 9.2 Status Updated

```
Hello {{CustomerName}},

Your service ticket has been updated.

Ticket Number:
{{TicketNumber}}

Current Status:
{{OverallStatus}}

Estimated Completion:
{{ETA}}

Thank you for choosing MSPL Rentals.
```

---

## 9.3 Charges Updated

```
Hello {{CustomerName}},

Your service ticket has been updated.

Ticket Number:
{{TicketNumber}}

Estimated Charges:
₹{{EstimatedCharges}}

Final Charges:
₹{{FinalCharges}}

For any clarification, please contact our support team.

Thank you.
```

---

## 9.4 Ticket Closed

```
Hello {{CustomerName}},

Your service request has been completed.

Ticket Number:
{{TicketNumber}}

Thank you for choosing MSPL Rentals.

We appreciate your trust in us.
```

---

# 10. Multiple Issue Summary

If a ticket contains multiple issues, the notification includes a summary.

Example

```
Issues

✓ Battery

✓ Brake

⏳ Charging
```

The customer receives a single consolidated message.

---

# 11. Notification Logging

Every notification attempt creates a NotificationLog record.

Stored information:

- Ticket ID
- Channel
- Message
- Delivery Status
- Response ID
- Sent Time
- Created Time

Notification logs are immutable.

---

# 12. Delivery Status

Supported statuses:

- Pending
- Sent
- Delivered
- Failed

Future versions may include:

- Read
- Expired
- Retried

---

# 13. Failure Handling

If WhatsApp delivery fails:

- Ticket update remains committed.
- NotificationLog records failure.
- Notify Customer is reset to FALSE.
- Coordinator may retry by selecting Notify Customer again and clicking **📤 Publish Updates**.

---

# 14. Duplicate Prevention

The Notification Engine must prevent duplicate notifications for the same publish action.

Each publish operation generates at most one notification.

---

# 15. Performance

Target response times:

| Operation | Target |
|-----------|--------|
| Message Generation | < 200 ms |
| Notification Creation | < 500 ms |
| WhatsApp Submission | < 2 seconds |

---

# 16. Security

Notifications:

- Must never expose internal notes.
- Must never expose coordinator names.
- Must never expose audit information.
- Must only include customer-safe information.

---

# 17. Future Enhancements

Version 2 may introduce:

- Email notifications
- SMS notifications
- Push notifications
- Notification templates managed from the database
- Multi-language messages
- Rich WhatsApp interactive messages
- Scheduled notifications
- Automatic retry mechanism
- Customer satisfaction survey after ticket closure

---

# 18. References

- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 07_Technical_Architecture.md
- 10_Workflow_Engine.md
- 11_Excel_Workspace.md

---

# Approval

Status: APPROVED

This document defines the Notification Engine for MSPL Assist Version 1.

All customer-facing communications must be generated and managed by this engine.