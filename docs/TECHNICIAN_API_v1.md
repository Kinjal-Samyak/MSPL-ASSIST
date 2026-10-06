# Technician Console API v1

All endpoints require `Authorization: Bearer <access-token>`. The approved access matrix is `ADMIN` and `TECHNICIAN` allowed; `COORDINATOR` is denied with the standard `403 Access denied` response. Responses use `{ "success": true, "data": ... }`.

## Read endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/technician/dashboard` | Technician-specific KPI summary. |
| GET | `/api/v1/technician/jobs?page=1&pageSize=25&search=` | Assigned jobs. Search matches MV Track Number, Ticket Number and Rider Name; MV Track Number is the primary operational identifier. |
| GET | `/api/v1/technician/jobs/search` | Alias of the assigned-job search endpoint. |
| GET | `/api/v1/technician/jobs/:ticketId` | Read-only assigned-job, complaint and inventory-resolved asset detail. |

The detail endpoint returns current model, registration, hub, deployment status and rider from the Inventory Provider using the ticket deployment's MV Track Number. It does not persist an asset snapshot.

Technician workflow endpoints append records through existing Ticket activity and attachment persistence. They do not introduce a Technician database model or Prisma migration.

## Controlled workflow endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| PATCH | `/api/v1/technician/jobs/:ticketId/milestone` | Advance exactly one permitted milestone; optional `action` supports the approved `WAITING_FOR_PARTS` branch. Arbitrary status updates are impossible. |
| POST | `/api/v1/technician/jobs/:ticketId/inspection` | Persist initial findings and optional diagnosis information only after inspection starts. |
| POST | `/api/v1/technician/jobs/:ticketId/notes` | Append an immutable repair note. |
| POST | `/api/v1/technician/jobs/:ticketId/photos` | Attach an existing storage reference; does not implement a new storage system. |
| GET | `/api/v1/technician/jobs/:ticketId/timeline` | Return immutable Technician activity records. |
| GET | `/api/v1/technician/jobs/:ticketId/history` | Return repair history associated with the same MV Track Number. |
