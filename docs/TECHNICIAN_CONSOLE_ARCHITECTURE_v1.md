# Technician Console Architecture v1

## Stage 1 boundary

The Technician Console is an isolated feature under `frontend/src/features/technician` and the new singular `/api/v1/technician` API namespace. The existing plural `/api/v1/technicians` lookup API is unchanged.

The console provides a technician-scoped dashboard, assigned-job list/search, inventory-backed detail view, and a controlled repair workflow. It does not alter or duplicate Ticket, Workshop, Deployment, or Inventory records.

## Ownership and dependencies

```text
Technician Console (presentation + technician-scoped read API)
        | reads assigned Ticket data
        v
Ticket domain -----> Deployment MV Track Number -----> Inventory Provider
                                                   (asset source of truth)
```

- Ticket owns service request, complaint, priority and assignment.
- Inventory Provider owns current asset attributes. The console resolves them by MV Track Number for every response.
- The Technician Console introduces no database objects. It records workflow, inspection and repair-note metadata through existing `TicketActivity`; it uses existing `TicketAttachment` records for photo references. Existing assignment, status history and ticket data remain the single source of truth.
- Parts is represented only by a visible, non-functional extension point.

## Security and API boundary

All console endpoints require a valid access token. `ADMIN` and `TECHNICIAN` are authorized through the existing `requireRoles` middleware; `COORDINATOR` receives the standard `403 Access denied` response. Each query filters technician-scoped work by the authenticated user id (`assignedToId`), preventing a technician from reading another technician's jobs.

The frontend uses the same centralized route-role metadata for sidebar visibility and direct URL protection. Hiding an item is only a usability control; the backend middleware remains the authorization authority for Technician APIs.

No existing route or contract is modified. No Technician Prisma migration is required or included.
