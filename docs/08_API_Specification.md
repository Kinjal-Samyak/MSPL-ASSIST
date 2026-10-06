Perfect. Continue the same way.

Paste this into:

**`docs/08_API_Specification.md`**

---

````markdown
# MSPL Assist
# API Specification

| Document | API Specification |
|----------|-------------------|
| Version | 1.0 |
| Status | APPROVED (Version 1 Frozen) |
| Owner | Engineering Team |
| Last Updated | July 2026 |

---

# 1. Purpose

This document defines all backend REST APIs exposed by MSPL Assist Version 1.

It specifies:

- API Endpoints
- HTTP Methods
- Request Contracts
- Response Contracts
- Validation Rules
- Error Responses

The APIs defined here are the only supported interfaces between the frontend, WhatsApp integration, Excel integration, and the backend.

---

# 2. API Design Principles

APIs must:

- Follow REST conventions.
- Return JSON.
- Be stateless.
- Validate all incoming requests.
- Never expose database implementation details.
- Return standardized success and error responses.

---

# 3. Base URL

Development

```
http://localhost:5000/api/v1
```

Production

```
https://api.msplassist.com/api/v1
```

---

# 4. Standard Response Format

## Success

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

---

## Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

---

# 5. Authentication

Version 1

No authentication.

Future versions

JWT Authentication

Role Based Authorization

---

# 6. Health APIs

---

## GET /health

Purpose

Check application health.

### Response

```json
{
  "status": "ok",
  "application": "MSPL Assist",
  "version": "1.0.0"
}
```

HTTP Status

200 OK

---

# 7. Conversation APIs

---

## POST /conversation/message

Purpose

Receives incoming WhatsApp messages.

### Request

```json
{
  "whatsappNumber": "919999999999",
  "message": "Hi"
}
```

### Response

```json
{
  "success": true,
  "reply": "Welcome to MSPL Assist...",
  "conversationState": "MAIN_MENU"
}
```

---

Validation

- WhatsApp Number required.
- Message required.

---

HTTP Status

200

400

500

---

## POST /conversation/reset

Purpose

Resets an active conversation.

### Request

```json
{
  "whatsappNumber": "919999999999"
}
```

### Response

```json
{
  "success": true,
  "message": "Conversation reset successfully."
}
```

---

# 8. Ticket APIs

---

## POST /tickets

Purpose

Create a new ticket.

Business Rules

- Only one ACTIVE ticket allowed.
- Existing ACTIVE ticket returns option to append issue.

### Request

```json
{
  "customerMobile": "9876543210",
  "issueCategories": [
    "Battery",
    "Brake"
  ],
  "description": "Vehicle stops suddenly."
}
```

---

### Success Response

```json
{
  "success": true,
  "ticketNumber": "MV-100726-001",
  "existingTicket": false
}
```

---

### Existing Ticket Response

```json
{
  "success": true,
  "existingTicket": true,
  "ticketNumber": "MV-100726-001",
  "message": "Customer already has an active ticket."
}
```

---

HTTP Status

201

400

409

500

---

## GET /tickets/{ticketNumber}

Purpose

Retrieve ticket details.

### Response

```json
{
  "ticketNumber": "MV-100726-001",
  "status": "Repair In Progress",
  "eta": "Today 4 PM",
  "primaryIssue": "Battery"
}
```

---

HTTP Status

200

404

---

## PATCH /tickets/{ticketId}

Purpose

Update ticket.

Allowed updates

- ETA
- Charges
- Notes

Status changes handled separately.

---

## PATCH /tickets/{ticketId}/status

Purpose

Update ticket status.

Business Rules

Only valid transitions permitted.

Creates TicketHistory automatically.

Creates TicketActivity automatically.

---

## PATCH /tickets/{ticketId}/publish

Purpose

Publish customer update.

Business Rules

- Notify Customer checked.
- Generate message.
- Send WhatsApp.
- Create Notification Log.
- Reset Notify Customer.

---

# 9. Ticket Issue APIs

---

## POST /tickets/{ticketId}/issues

Purpose

Append issue to existing ticket.

Business Rules

- Duplicate issue categories prohibited.
- Issue Sequence auto generated.

### Request

```json
{
  "issueCategory": "Charging",
  "description": "Charging not working."
}
```

---

### Response

```json
{
  "success": true,
  "issueSequence": 3
}
```

---

## PATCH /ticket-issues/{issueId}

Purpose

Update issue.

Allowed

- Status
- Charges
- Technician Notes

---

## GET /tickets/{ticketId}/issues

Purpose

Retrieve all issues associated with a ticket.

````
---

# 10. Master Data APIs

## GET /masters/statuses

### Purpose

Retrieve all active ticket statuses.

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Open",
      "displayOrder": 1
    }
  ]
}
```

---

## GET /masters/issue-categories

### Purpose

Retrieve Issue Categories.

### Response

```json
{
  "success": true,
  "data": [
    {
      "id":"uuid",
      "name":"Battery"
    },
    {
      "id":"uuid",
      "name":"Charging"
    }
  ]
}
```

---

## GET /masters/hubs

Returns all active hubs.

---

## GET /masters/vehicle-models

Returns all active vehicle models.

---

# 11. Excel APIs

## GET /excel/tickets

### Purpose

Returns all tickets for Excel Online.

### Response

```json
{
    "success": true,
    "data":[]
}
```

---

## GET /excel/ticket-issues

### Purpose

Returns all Ticket Issue Items.

---

## POST /excel/publish

### Purpose

Publishes coordinator changes.

This endpoint performs:

- Validation
- Workflow Validation
- Database Update
- History Creation
- Activity Creation
- Notification
- Publish Result

---

### Request

```json
{
    "tickets":[
        {}
    ],
    "ticketIssues":[
        {}
    ]
}
```

---

### Response

```json
{
    "success":true,
    "processed":25,
    "failed":1
}
```

---

# 12. Notification APIs

## POST /notifications/send

Internal API.

Used only by Publish Service.

---

## GET /notifications/{ticketId}

Returns Notification History.

---

# 13. Audit APIs

## GET /tickets/{ticketId}/history

Returns TicketHistory.

---

## GET /tickets/{ticketId}/activity

Returns TicketActivity.

---

# 14. Conversation Session APIs

## GET /conversation/session/{whatsappNumber}

Returns current conversation.

---

## DELETE /conversation/session/{whatsappNumber}

Deletes conversation session.

Used for

START

RESET

NEW

---

# 15. Common HTTP Status Codes

| Code | Meaning |
|-------|----------|
|200|Success|
|201|Created|
|204|No Content|
|400|Validation Error|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Business Rule Failed|
|500|Internal Server Error|

---

# 16. Validation Rules

All APIs validate

- Required fields
- Mobile number
- Ticket Number
- UUID format
- Enum values
- Status transitions
- Charges
- ETA
- Duplicate Issues

Validation occurs before any transaction begins.

---

# 17. Idempotency

The following APIs are idempotent.

GET

PATCH

Publish Updates

Repeated requests should never create duplicate records.

---

# 18. Transactions

The following APIs execute inside one transaction.

POST /tickets

PATCH /tickets/{id}/status

POST /excel/publish

If one operation fails

↓

Rollback

---

# 19. API Versioning

Current Version

```
v1
```

Future versions

```
v2

v3
```

must remain backward compatible whenever possible.

---

# 20. Security

Future Version

JWT Authentication

Role Based Authorization

API Rate Limiting

Audit Logging

Version 1 operates inside a trusted environment.

---

# 21. References

- 04_Business_Rules.md

- 05_Functional_Specification.md

- 06_Database_Design.md

- 07_Technical_Architecture.md

---

# Approval

Status

APPROVED

This document defines all REST APIs for MSPL Assist Version 1.