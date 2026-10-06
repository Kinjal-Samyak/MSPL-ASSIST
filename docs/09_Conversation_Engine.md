Perfect. Next is **09_Conversation_Engine.md**.

This document defines exactly how the WhatsApp conversation behaves. It will become the implementation guide for your `ConversationEngine`, `ConversationService`, `ConversationRepository`, and all state handlers.

Paste this into:

**`docs/09_Conversation_Engine.md`**

---

````markdown
# MSPL Assist
# Conversation Engine

| Document | Conversation Engine |
|----------|---------------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Engineering Team |
| Last Updated | July 2026 |

---

# 1. Purpose

The Conversation Engine manages every customer interaction over WhatsApp.

Its responsibilities are:

- Start new conversations
- Resume existing conversations
- Guide customers step-by-step
- Collect ticket information
- Validate user inputs
- Create or update tickets
- Handle conversation expiry
- Maintain conversation state

The Conversation Engine does not contain database logic. It delegates persistence to the Conversation Service and Repository.

---

# 2. Design Principles

- Every customer has one active conversation session.
- Conversation resumes within 24 hours.
- Session expires after 24 hours of inactivity.
- Every conversation is state-driven.
- One state = one responsibility.
- Customer should never be asked for information already known.
- Messages should be simple, professional, and concise.

---

# 3. Conversation Flow

```
Customer

↓

MAIN_MENU

↓

Register Service Issue

↓

CHECK_ACTIVE_TICKET

↓

Issue Selection

↓

Add More Issues?

↓

Issue Description

↓

Photo Upload

↓

Registered Mobile

↓

Customer Verification

↓

Deployment Verification

↓

Create Ticket / Append Issue

↓

Confirmation

↓

END
```

---

# 4. Conversation States

| State | Purpose |
|---------|----------|
| MAIN_MENU | Initial menu |
| CHECK_ACTIVE_TICKET | Check if customer already has an active ticket |
| ISSUE_SELECTION | Select issue categories |
| ADD_MORE_ISSUES | Ask if another issue should be added |
| ISSUE_DESCRIPTION | Capture issue description |
| PHOTO_UPLOAD | Optional image upload |
| MOBILE_VERIFICATION | Capture registered mobile |
| CUSTOMER_LOOKUP | Verify customer |
| DEPLOYMENT_LOOKUP | Verify deployment |
| CREATE_TICKET | Create or update ticket |
| TRACK_TICKET | Track existing ticket |
| CONFIRMATION | Display success message |
| COMPLETED | Conversation finished |

---

# 5. Main Menu

Trigger

Customer sends:

```
Hi
```

or

```
Hello
```

or

```
START
```

or

```
RESET
```

or

```
NEW
```

System Response

```
Welcome to MSPL Assist 👋

Please choose an option.

1️⃣ Register Service Issue

2️⃣ Track Existing Ticket
```

Next State

MAIN_MENU

---

# 6. Register Service Issue

Customer selects:

```
1
```

System moves to

CHECK_ACTIVE_TICKET

---

# 7. Check Active Ticket

Backend checks:

- Customer exists?
- Active ticket exists?

If NO active ticket

↓

Continue to ISSUE_SELECTION

---

If ACTIVE ticket exists

Display

```
You already have an active service ticket.

Ticket Number:
MV-100726-001

Current Status:
Inspection

Would you like to add another issue?

1️⃣ Yes

2️⃣ No
```

---

If customer selects

Yes

↓

Append issue to existing ticket.

If No

↓

Conversation ends.

---

# 8. Issue Selection

Display

```
Select the issue category.

1️⃣ Battery

2️⃣ Charging

3️⃣ Brake

4️⃣ Tyre / Puncture

5️⃣ Motor

6️⃣ Throttle / Acceleration

7️⃣ Accident

8️⃣ Other
```

Issue categories are loaded from the IssueCategory master table.

---

# 9. Add More Issues

After selecting one issue

Display

```
Issue added.

Would you like to add another issue?

1️⃣ Yes

2️⃣ No
```

Duplicate issue categories are not permitted.

---

# 10. Issue Description

Prompt

```
Please describe the issue.
```

Customer enters free-text description.

---

# 11. Photo Upload

Prompt

```
Please upload a photo of the issue.

You may type SKIP if unavailable.
```

Photo is optional.

---

# 12. Mobile Verification

Prompt

```
Please enter your registered mobile number.
```

Validation

- Required
- 10-digit mobile number

---

# 13. Customer Lookup

System verifies customer.

If customer found

↓

Continue.

If not found

Display

```
We could not verify your registered mobile number.

Please contact customer support.
```

Conversation ends.

---

# 14. Deployment Lookup

System searches for the customer's active deployment.

If found

↓

Store deployment reference.

If not found

↓

Set deploymentVerified = false.

Continue.

---

# 15. Ticket Creation

If customer has no active ticket

↓

Create new ticket.

If customer already has an active ticket and chose "Yes"

↓

Append TicketIssueItem.

No new ticket is created.

---

# 16. Confirmation

Display

```
Thank you.

Your request has been registered.

Ticket Number

MV-100726-001

Our coordinator will contact you shortly.
```

State becomes

COMPLETED

---

# 17. Track Existing Ticket

Customer selects

```
2
```

Prompt

```
Please enter your Ticket Number.
```

If ticket exists

Display

- Ticket Number
- Primary Issue
- Overall Status
- ETA
- Issue Summary

If not found

Display

```
Ticket not found.

Please verify the Ticket Number.
```

---

# 18. Session Management

Each conversation stores:

- WhatsApp Number
- Current State
- Conversation Data
- Last Interaction Time
- Expiry Time

Sessions expire after 24 hours.

---

# 19. Error Handling

Invalid menu selection

↓

Prompt again.

Invalid mobile number

↓

Prompt again.

Database failure

↓

Display

```
We are currently unable to process your request.

Please try again later.
```

---

# 20. Logging

Every conversation event creates a TicketActivity entry where applicable.

Examples

- Conversation Started
- Issue Selected
- Photo Uploaded
- Ticket Created
- Issue Appended

---

# 21. References

- 04_Business_Rules.md
- 05_Functional_Specification.md
- 06_Database_Design.md
- 07_Technical_Architecture.md

---

# Approval

Status: APPROVED

This document defines the official Conversation Engine behavior for MSPL Assist Version 1.
````
