# NimboB2B.Import

One-shot importer that copies every row + file from the current Supabase project
into the new .NET Postgres database and `Storage:RootPath`. Idempotent (upsert
by PK) so it can be re-run safely.

## Usage

```bash
export SUPABASE_DB_URL="postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_SERVICE_ROLE_KEY="<service role key>"
export SUPABASE_URL="https://<ref>.supabase.co"
export TARGET_DB="Host=localhost;Database=nimbob2b;Username=nimbo;Password=..."
export STORAGE_ROOT="/var/lib/nimbob2b/files"

dotnet run --project src/NimboB2B.Import
```

## What it copies

Tables (dependency order):
`profiles`, `user_roles`, `orders`, `vehicles`, `stage_documents`, `stage_skips`,
`pdi_uploads`, `final_pdi_verifications`, `individual_invoices`, `bulk_invoices`,
`rto_slips`, `rto_excel_uploads`, `insurance_policies`, `insurance_excel_uploads`,
`vehicle_insurance_policies`, `billing_notes`, `vehicle_assignment_events`.

Files: every object under the `nimbo-files` storage bucket is downloaded via the
Supabase Storage HTTP API using the service role key and written to
`STORAGE_ROOT/nimbo-files/...`, preserving the original relative path.

Prints a reconciliation report at the end (row counts per table, files
transferred vs expected, missing objects).
