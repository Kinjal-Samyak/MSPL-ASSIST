# MSPL Assist
# Excel Workspace

| Document | Excel Workspace |
|----------|-----------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Operations Team |
| Last Updated | July 2026 |

---

# 1. Purpose

The Excel Online Workspace is the operational interface used by Service Coordinators.

Excel is designed to provide a familiar and simple environment for managing service tickets while keeping PostgreSQL as the single source of truth.

Excel is **not** a database.

All updates are synchronized through the backend.

---

# 2. Design Principles

The workspace must:

- Be simple enough for non-technical users.
- Minimize typing.
- Prevent accidental data modification.
- Clearly distinguish editable and read-only fields.
- Require only one action to publish updates.

---

# 3. Workspace Structure

The workbook contains two worksheets.

```
MSPL Assist

│

├── Tickets

│

└── Ticket Issues
```

---

# 4. Tickets Sheet

This sheet provides one row per ticket.

Purpose:

- Dashboard
- Search
- Overall status
- Coordinator updates

---

## Columns

| Column | Editable | Description |
|----------|----------|-------------|
| Ticket Number | ❌ | System Generated |
| Customer Name | ❌ | Customer |
| Registered Mobile | ❌ | Customer Mobile |
| Vehicle Number | ❌ | Vehicle Registration |
| MV Track Number | ❌ | Fleet Tracking Number |
| Vehicle Model | ❌ | Vehicle Model |
| Hub | ❌ | Hub Name |
| Primary Issue | ❌ | First Issue Selected |
| Overall Status | ✅ | Current Ticket Status |
| ETA | ✅ | Expected Completion |
| Estimated Charges | ✅ | Estimated Cost |
| Final Charges | ✅ | Final Cost |
| Internal Notes | ✅ | Coordinator Notes |
| Notify Customer | ✅ | TRUE / FALSE |
| Last Published | ❌ | Last Publish Timestamp |
| Last Updated | ❌ | Audit Timestamp |

---

# 5. Ticket Issues Sheet

One row per issue.

Purpose

Track individual issues attached to a ticket.

---

## Columns

| Column | Editable | Description |
|----------|----------|-------------|
| Ticket Number | ❌ | Ticket Reference |
| Issue Sequence | ❌ | Auto Generated |
| Issue Category | ❌ | Issue Category |
| Description | ❌ | Customer Description |
| Issue Status | ✅ | Current Status |
| Estimated Charges | ✅ | Issue Estimate |
| Final Charges | ✅ | Final Charges |
| Technician Notes | ✅ | Internal Notes |
| Last Updated | ❌ | Audit Timestamp |

---

# 6. Editable Fields

The coordinator may edit only:

Tickets Sheet

- Overall Status
- ETA
- Estimated Charges
- Final Charges
- Internal Notes
- Notify Customer

Ticket Issues Sheet

- Issue Status
- Estimated Charges
- Final Charges
- Technician Notes

All other columns are read-only.

---

# 7. Read-Only Fields

The following fields cannot be edited:

- Ticket Number
- Customer Name
- Mobile Number
- Vehicle Number
- MV Track Number
- Vehicle Model
- Hub
- Primary Issue
- Issue Category
- Issue Sequence
- Last Published
- Audit Timestamps

These values are maintained by the backend.

---

# 8. Publish Updates

The Excel workbook contains one action button.

```
📤 Publish Updates
```

Purpose

Synchronize coordinator changes with PostgreSQL.

---

Workflow

Coordinator

↓

Updates data

↓

Selects

Notify Customer

↓

Clicks

📤 Publish Updates

↓

Backend validates changes

↓

Database updated

↓

TicketHistory created (if status changed)

↓

TicketActivity created

↓

Notification generated (if Notify Customer = TRUE)

↓

NotificationLog created

↓

Notify Customer reset to FALSE

↓

Last Published updated

---

# 9. Validation

Before publishing:

Backend validates

- Ticket exists.
- Status transition is valid.
- Charges are numeric.
- ETA format is valid.
- Row version is current.

Invalid records are rejected.

Successful records continue processing.

---

# 10. Conflict Handling

If another coordinator updates the same ticket before publishing:

Backend detects rowVersion mismatch.

Publish fails for that ticket.

Excel displays:

```
Ticket has been modified by another user.

Please refresh and try again.
```

No partial update occurs.

---

# 11. Automatic Refresh

After a successful publish:

Backend returns updated values.

Excel refreshes automatically.

Coordinator does not manually refresh.

---

# 12. Customer Notification

Notifications are optional.

Notification is sent only when:

Notify Customer = TRUE

AND

Coordinator clicks

```
📤 Publish Updates
```

Messages are generated automatically.

Coordinator never types customer messages.

---

# 13. Error Handling

If validation fails:

Display the validation error.

If database update fails:

Rollback transaction.

Display error.

If WhatsApp fails:

Database update remains successful.

NotificationLog records failure.

---

# 14. Performance

Publish operation target

< 5 seconds

Workbook should remain responsive.

Large ticket volumes should not degrade coordinator experience.

---

# 15. Security

Coordinator cannot:

- Edit customer master data.
- Modify ticket numbers.
- Delete tickets.
- Delete audit history.
- Delete notification history.

All updates occur through backend APIs.

---

# 16. Future Enhancements

Planned for future versions:

- Dashboard worksheet
- Technician assignment
- Conditional formatting
- SLA indicators
- Filters by hub
- Power BI integration
- Bulk publish
- Offline editing

---

# 17. References

- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 07_Technical_Architecture.md
- 10_Workflow_Engine.md
- 12_Notification_Engine.md

---

# Approval

Status: APPROVED

This document defines the Excel Online Workspace for MSPL Assist Version 1.

Excel is an operational workspace only.

PostgreSQL remains the single source of truth.