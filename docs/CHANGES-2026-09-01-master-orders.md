# Master Order Groups, Clients & ETD — 2026-09-01

## What changed

### Client master
- New `clients` table: name, state, city, GST number, GST PDF (file stored with relative path, signed at read time).
- New **Clients** page (`/clients`) listing all clients with search and a link to the GST PDF.
- New **Client detail** page (`/clients/:clientId`) with an edit form, GST PDF upload, the orders linked to that client, and a **Map existing orders** section that lists unlinked orders and lets admin/Rajat attach them to the client.
- Clients are auto-created from existing orders on migration (one client per distinct `client_name`), and auto-created at order-creation time when a name is typed that doesn't exist yet.

### Orders
- `orders` gains: `city`, `client_id`, `master_order_group_id`, `etd`, `hypothecation_name`. All nullable — existing orders keep working.
- Order creation uses a searchable **Client picker** (select → state/city/GST auto-fill) with an inline **Add Client** form (GST PDF upload included).
- City is a dropdown driven by the selected state (`STATE_CITIES` in `src/lib/stages.ts`), never free text.
- **Edit Order** now edits every field (client, quantity, state, city, ETD, GST, contact, finance partner, funded-by, hypothecation, notes). Order ID and creation timestamp are immutable and shown read-only.
- Every field change is written to `order_change_logs`; every ETD change additionally goes to `order_etd_history`. Both render in a **Change Log** card on the order detail page.

### Master order groups
- `master_order_groups`: `code` (`MO-1001`, `MO-1002`, …), `client_id`, `total_quantity` (sum of linked order quantities, maintained on create/update/map).
- Auto-grouping: creating an order for a client attaches it to that client's open master group; the group total is updated automatically.
- Uploading a **Proforma Invoice** on one order propagates the same file to the PI slot of every sibling order in the group.
- Order detail page shows a **Master Group** card: group code, total requirement, sibling orders (linkable, each with units / ETD / X-of-8 progress).

### Progress — always X/8
- Fixed step list: PI, Billing, Initial PDI, Invoices, Form 21/22, Insurance, RTO, Final PDI.
- Initial PDI completes when assigned vehicles ≥ quantity; Insurance when vehicles with a policy file ≥ quantity; RTO when vehicles with an RTO slip ≥ quantity; document-slot steps complete when all their required slots are uploaded; skipped stages count as complete.
- Percentage is still computed for bar width; the headline number everywhere is `steps_completed / 8`, capped at 8.
- Orders list and dashboard use the same shared calculator (`OrderProgressCalculator`).

### Orders list (`/orders`)
- Columns: Created, Client, Type, Qty, State, City, ETD, Progress (X/8).
- Filters (client-side): search, PI type, client, city, date, month, year.
- **Group by: Client / None** toggle — collapsible sections per client with per-group step totals and weighted progress.

## Database

Run the EF migration locally (additive only — ALTER TABLE + new tables, no drops):

```bash
cd backend
dotnet ef migrations add ClientsMasterOrderGroups --project src/NimboB2B.Migrations --startup-project src/NimboB2B.Api
dotnet ef database update --project src/NimboB2B.Migrations --startup-project src/NimboB2B.Api
```

Then run the idempotent backfill (creates clients + master groups from existing orders):

```bash
psql "$CONNECTION_STRING" -f sql/2026-09-07-clients-master-groups-backfill.sql
```

## Files changed

### Backend
- `backend/src/NimboB2B.Domain/Entities/Entities.cs` — `Client`, `MasterOrderGroup`, `OrderEtdHistory`, `OrderChangeLog`; new `Order` columns.
- `backend/src/NimboB2B.Infrastructure/Persistence/AppDbContext.cs` — DbSets, indexes, FKs (SetNull).
- `backend/src/NimboB2B.Application/Dtos/Dtos.cs` — create/update/summary DTO fields, `ProgressDto` steps, client DTOs.
- `backend/src/NimboB2B.Application/Services/ClientService.cs` — new.
- `backend/src/NimboB2B.Api/Controllers/ClientsController.cs` — new (`GET/POST/PATCH /api/v1/clients`, `gst`, `map-orders`, `unmapped-orders`).
- `backend/src/NimboB2B.Application/Services/OrderService.cs` — list/detail/create/update wiring for clients, groups, ETD history, change log, PI copy.
- `backend/src/NimboB2B.Application/Services/OrderProgressCalculator.cs` — 8-step model, vehicle-count steps.
- `backend/src/NimboB2B.Application/Services/StageOpsService.cs` — PI propagation to sibling orders.
- `backend/src/NimboB2B.Api/Program.cs` — `ClientService` registration.
- `backend/sql/2026-09-07-clients-master-groups-backfill.sql` — new.

### Frontend
- `src/lib/stages.ts` — `STATE_CITIES`, `citiesForState()`.
- `src/lib/orders.functions.ts` — ETD / client / city / hypothecation in schemas.
- `src/lib/clients.functions.ts` — new.
- `src/components/client-picker.tsx` — new (`ClientPicker`, `AddClientForm`).
- `src/routes/_authenticated/orders.index.tsx` — columns, filters, client grouping, client picker in create modal.
- `src/routes/_authenticated/orders.$orderId.tsx` — master-group card, ETD/change log card, full edit modal, X/8 headline.
- `src/routes/_authenticated/clients.tsx` — new.
- `src/routes/_authenticated/clients.$clientId.tsx` — new.
- `src/components/app-shell.tsx` — Clients nav entry.
- `docs/CHANGES-2026-09-01-master-orders.md` — this file.

## Permissions
- Client create/edit, GST upload, order mapping: admin / Rajat's team only.
- Everyone authenticated can view clients, groups, ETD history and change logs.
