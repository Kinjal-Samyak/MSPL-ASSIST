# Coordinator Excel Import — Sprint 2

## Scope and isolation

The Excel Import Wizard is an additive Coordinator capability. It introduces new `/api/v1/import/*` routes, services, pages, and import-audit tables only. Existing ticket routes, ticket service behaviour, operational Excel synchronization, authentication, and module navigation remain unchanged.

Only authenticated `ADMIN` and `COORDINATOR` users can access the new endpoints.

## Workbook contract

The supplied operational workbook, `Service Details - Update.xlsx`, was inspected read-only. Its import source is the `Service Register` worksheet. The remaining sheets (`Ser. Reg. Sum.`, `Vehicle Received`, and `Down Vehicle`) are not imported in Sprint 2.

| Workbook column | Import purpose |
| --- | --- |
| `Ticket No.` | Idempotency key: create when new; update when already present |
| `Status` | Matched to an active Status Master record |
| `Complaint received/Login Date` | Required validation date |
| `Customer Name` | Rider display name |
| `Customer Contact Number` | Rider phone number; normalized to a ten-digit business key |
| `HUB Location` | Optional hub reference when supplied |
| `Location` | Workbook workshop/location value retained in the preview |
| `VIN No` | Deployment/MV Track lookup candidate |
| `Motor No` | Vehicle/deployment lookup candidate |
| `Cx VOC` | Issue description; mapped to the existing Issue Category Master by keywords, otherwise `Other` |

Column matching normalizes whitespace, punctuation, and case. The first row remains the header row; coordinators do not need to rename columns or reformat the workbook.

## Workflow

1. Coordinator chooses an `.xlsx` workbook (maximum 10 MB).
2. The server confirms a readable workbook and the `Service Register` sheet, maps required headers, validates rows, detects duplicate ticket numbers, and persists a preview/audit batch.
3. The Coordinator reviews insert, update, duplicate, invalid, warning, and error counts; a CSV error report is available.
4. **Import all valid records** processes only validated insert/update rows. A repeated `Ticket No.` updates its imported ticket rather than creating another ticket.
5. `ImportBatch` and `ImportError` retain user, timestamp, source file metadata, counts, mapping, preview, and errors for the Import History page.

## Validation

Invalid rows are excluded from commit. Validations cover file type and size, readable workbook, required sheet, empty workbook, required columns, ticket number, rider name, 10-digit mobile number, login date, active status, active mapped issue category, and duplicate ticket numbers within the workbook.

The workbook currently has an optional/blank `HUB Location` column. A blank hub produces a warning rather than inventing a hub; the `Location` value is retained as workshop context. This is intentional until the business provides a workshop master and a mandatory hub mapping.

## Database migration

Migration `20260718000000_add_coordinator_import_models` creates only:

- `ImportBatch`
- `ImportError`
- `ImportBatchStatus` and `ImportErrorSeverity` enums

It does not alter production ticket, rider, deployment, or vehicle tables.

Before running the feature in an environment, apply the normal Prisma migration and regenerate the client after stopping any process that holds the Prisma Windows engine file:

```powershell
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Known Sprint 2 boundary

This is a controlled migration path, not a replacement for the existing Ticket Engine. It uses the ticket number as the legacy idempotency key and performs no ticket-status workflows, notifications, ticket workbench activity, scheduled imports, OneDrive/SharePoint connection, or report changes.
