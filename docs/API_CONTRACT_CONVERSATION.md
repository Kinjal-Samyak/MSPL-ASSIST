# Conversation Ticket API Contract

## Endpoint

`POST /api/v1/tickets/conversation`

This additive endpoint creates a ticket through the existing Ticket Service, then persists conversation-only data. It does not replace or alter `POST /api/v1/tickets`.

## Request

```json
{
  "registeredMobile": "9876543210",
  "mvTrackNumber": "MVTEST002",
  "vehicleNumber": "MVTEST002",
  "rideabilityStatus": "MOVABLE",
  "issueGroups": [
    {
      "issueCategoryId": "uuid",
      "issueSubcategory": "Not Charging",
      "description": "Battery does not charge"
    }
  ],
  "remarks": "Optional, maximum 200 words.",
  "photoReferences": [
    { "fileUrl": "storage://photo-1", "fileType": "image/jpeg" }
  ],
  "conversationMetadata": { "channel": "WEB" }
}
```

`rideabilityStatus` is required and must be `MOVABLE` or `NOT_MOVABLE`. At least one issue group is required. Photos, remarks, vehicle number, and metadata are optional.

## Response

The response retains the existing ticket creation response shape:

```json
{
  "success": true,
  "data": {
    "existingTicket": false,
    "ticketId": "uuid",
    "ticketNumber": "MV-YYMMDD-001",
    "createdAt": "ISO-8601 timestamp"
  }
}
```

If the rider already has an active ticket, `existingTicket` is `true` and no conversation records are appended.

## Read contracts

Existing `GET /api/v1/tickets/:ticketId` and `GET /api/v1/tickets` remain unchanged. Phase 2 should not assume conversation-only fields are exposed by those legacy DTOs until their additive read-model extension is approved.
