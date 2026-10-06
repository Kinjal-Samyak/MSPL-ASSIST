# MSPL Assist
# Business Rules

| Document | Business Rules |
|----------|----------------|
| Version | 1.0 |
| Status | Approved (Version 1 Frozen) |
| Owner | Product Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document defines the business rules governing the behavior of the MSPL Assist platform.

Business Rules are mandatory.

All application logic, APIs, workflows, and user interfaces must comply with these rules.

If there is a conflict between implementation and this document, this document takes precedence.

---

# 2. Customer Rules

## BR-001

A customer can register a service issue without having a deployment linked.

Reason:

Some customers may contact support from a WhatsApp number different from their registered mobile number.

The service request must still be accepted.

---

## BR-002

Vehicle lookup failure must never prevent ticket creation.

If no deployment is found:

- deploymentVerified = false
- Ticket is still created.
- Coordinator will verify later.

---

## BR-003

The customer should never be asked for information already available in the system.

---

## BR-004

A customer conversation must resume from the last completed step if resumed within 24 hours.

---

## BR-005

A conversation expires after 24 hours of inactivity.

Expired conversations start from the Main Menu.

---

## BR-006

Customer images are optional.

The customer may type:

SKIP

to continue.

---

# 3. Ticket Rules

## BR-007

Every ticket must have a unique Ticket Number.

Format

MV-DDMMYY-XXX

Example

MV-090726-001

---

## BR-008

Ticket numbers must never be reused.

Even if a ticket is deleted.

---

## BR-009

Every ticket must belong to exactly one customer.

---

## BR-010

A deployment association is optional.

---

## BR-011

Every ticket starts with Status = Open.

---

## BR-012

Every ticket starts with:

Priority = Normal

unless changed manually later.

---

## BR-013

Every ticket has one current status.

Status history is maintained separately.

---

## BR-014

Every ticket creation automatically creates:

- Ticket
- Ticket History
- Ticket Activity

inside one database transaction.

If one fails,

everything rolls back.

---

## BR-015

rowVersion starts at 1.

Used for optimistic locking.

---

# 4. Workflow Rules

## BR-016

Only valid status transitions are allowed.

Example

Open

↓

Assigned

↓

Inspection

↓

Repair

↓

Ready

↓

Completed

↓

Closed

Skipping mandatory workflow stages is not permitted unless explicitly allowed.

---

## BR-017

Every status change creates a Ticket History record.

---

## BR-018

Every business action creates a Ticket Activity record.

Examples

Ticket Created

Status Updated

ETA Updated

Charges Updated

Notification Published

Ticket Closed

---

## BR-019

Ticket History cannot be edited.

---

## BR-020

Audit history cannot be deleted.

---

# 5. Notification Rules

## BR-021

Customer notifications are sent only when:

Notify Customer = TRUE

---

## BR-022

Updating a ticket does NOT automatically notify the customer.

The coordinator decides when to notify.

---

## BR-023

Clicking

📤 Publish Updates

triggers customer notification generation.

---

## BR-024

Customer messages are automatically generated.

The coordinator never types notification text.

---

## BR-025

Every notification is stored in NotificationLog.

---

## BR-026

Failed notifications remain logged.

Future retry mechanisms will handle resending.

---

# 6. Coordinator Rules

## BR-027

Coordinator edits tickets only through the approved workspace.

Version 1:

Excel Online.

---

## BR-028

Coordinator cannot modify:

- Ticket Number
- Customer Details
- Audit History
- Notification History

---

## BR-029

Coordinator may update:

- Status
- ETA
- Estimated Charges
- Final Charges
- Internal Notes

---

## BR-030

Coordinator must explicitly choose whether to notify the customer.

---

# 7. Excel Rules

## BR-031

Excel Online is a workspace.

It is NOT the source of truth.

---

## BR-032

PostgreSQL remains the master database.

---

## BR-033

Publishing updates synchronizes Excel changes to PostgreSQL.

---

## BR-034

After successful publishing:

Notify Customer resets to FALSE.

---

# 8. Conversation Rules

## BR-035

The customer always begins at the Main Menu.

unless a valid session already exists.

---

## BR-036

Conversation state is stored in ConversationSession.

---

## BR-037

Conversation data must survive temporary interruptions.

---

## BR-038

Typing

START

RESET

NEW

creates a new conversation.

---

## BR-039

Issue Categories come from the IssueCategory master table.

Never hardcode categories.

---

## BR-040

Conversation prompts should be configuration-driven in a future version.

Version 1 may use application constants.

---

# 9. Data Rules

## BR-041

Statuses come from StatusMaster.

---

## BR-042

Issue Categories come from IssueCategory.

---

## BR-043

Vehicle Models come from VehicleModel.

---

## BR-044

Hubs come from Hub.

---

## BR-045

Master data should support soft delete.

---

# 10. Security Rules

## BR-046

All inputs must be validated.

---

## BR-047

All database writes occur through the backend.

Direct database editing is prohibited.

---

## BR-048

All business actions must be auditable.

---

# 11. Performance Rules

## BR-049

Ticket creation should complete within two seconds under normal load.

---

## BR-050

Conversation responses should complete within three seconds.

---

# 12. Future Rules

The following are planned for Version 2.

- AI-generated responses
- Dynamic conversation flow
- Dynamic prompt management
- Technician application
- Customer portal
- SLA automation
- Multi-language support
- Event-driven notification engine

---

# References

- 00_System_Blueprint.md
- 01_Product_Requirements.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 09_Conversation_Engine.md
- 10_Workflow_Engine.md

---

# Approval

Status: APPROVED

These business rules are the authoritative source for all implementation.

Any change to a business rule must be recorded in:

99_Decision_Log.md