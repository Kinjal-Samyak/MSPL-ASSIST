# NimboB2B .NET 8 Backend

Self-hosted ASP.NET Core 8 Web API. No Supabase dependency at runtime.

## Layout

```
src/
  NimboB2B.Api/            ASP.NET Core host (Program.cs, controllers, JWT auth)
  NimboB2B.Application/    DTOs, use-case services (Auth, Order, Vehicle, Insurance, StageOps)
  NimboB2B.Domain/         Entities + enums
  NimboB2B.Infrastructure/ EF Core DbContext, LocalFileStore, timestamp interceptor
  NimboB2B.Migrations/     `dotnet ef` migrations
  NimboB2B.Import/         CLI: seed users, bulk-create users from CSV, migrate a legacy Supabase DB + Storage bucket into this backend
tests/
  NimboB2B.Tests/          xUnit
```

## First-time local setup

```bash
# 1. Restore + build
dotnet restore

# 2. Create + apply migrations (auto-runs on API startup too)
dotnet ef migrations add Initial --project src/NimboB2B.Migrations --startup-project src/NimboB2B.Api
dotnet ef database update    --project src/NimboB2B.Migrations --startup-project src/NimboB2B.Api

# 3. Seed the first admin user (REQUIRED — no default account exists)
export TARGET_DB="Host=localhost;Port=5432;Database=nimbob2b;Username=nimbo;Password=changeme"
dotnet run --project src/NimboB2B.Import -- seed-admin admin@nimbob2b.com "ChangeThisNow!" "Site Admin"

# 4. Run the API — binds to http://localhost:5080 (matches VITE_API_BASE_URL)
dotnet run --project src/NimboB2B.Api

# 5. In another terminal, start the frontend
cd .. && npm run dev   # http://localhost:8080
```

Swagger UI: `http://localhost:5080/swagger`.

If sign-in shows "Failed to fetch": the API isn't on port 5080. Confirm the
`dotnet run` terminal prints `Now listening on: http://localhost:5080`
(pinned via `Properties/launchSettings.json`). If it shows 401 instead, the
admin user hasn't been seeded — run step 3.

## Configuration

Set via `appsettings.json` or environment variables (double-underscore syntax):

| Env var                          | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `ConnectionStrings__Default`     | Postgres connection string                           |
| `Jwt__Secret`                    | HMAC signing key (min 32 chars — generate with `openssl rand -base64 48`) |
| `Jwt__Issuer`                    | Token issuer (default `nimbob2b`)                    |
| `Jwt__Audience`                  | Token audience (default `nimbob2b-app`)              |
| `Jwt__ExpiryHours`               | Access token lifetime in hours (default 12)          |
| `Storage__RootPath`              | Filesystem root for uploaded files                   |
| `Storage__DownloadSigningKey`    | HMAC key for signed download URLs                    |
| `Storage__PublicBaseUrl`         | Public URL used inside signed download links         |
| `Cors__AllowedOrigins__0`        | First allowed browser origin (repeat with `__1`, `__2`) |

## Frontend wiring

Set `VITE_API_BASE_URL` to the backend URL (e.g. `http://localhost:5080`). No
Supabase env vars needed anywhere — sign-in goes to `POST /api/v1/auth/login`
and returns a JWT stored in `localStorage` under `nimbo_token`.

## Auth model

- Email + password. Passwords hashed with BCrypt (work factor 12).
- On successful `/api/v1/auth/login`, the API returns a JWT signed with
  `Jwt__Secret`. The frontend attaches it as `Authorization: Bearer <token>`
  on every subsequent call.
- User roles live in the `user_roles` table; role names on the wire match the
  original frontend enum (`admin`, `rajat_team`, `accounts`, `pdi_team`,
  `rto_agent`, `insurance_agent`, `service_team`).
- Create additional users via the importer CLI:

```bash
dotnet run --project src/NimboB2B.Import -- create-user rajat@example.com "TempPass!23" "Rajat" rajat_team
```

## Endpoint coverage

The following endpoints are implemented and used by the frontend today:

- **Auth**: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`
- **Dashboard**: `GET /dashboard/summary`
- **Orders**: `GET/POST /orders`, `GET /orders/ids`, `GET/PATCH /orders/{id}`, `GET /orders/{id}/assignment-events`
- **Vehicles**: `GET /vehicles`, `GET /vehicles/{idOrVin}`, `POST /vehicles/{vin}/unassign`, `GET /vehicles/{vin}/assignment-events`
- **Insurance**: `GET/POST /vehicles/{vin}/insurance`, `PATCH /insurance/{id}/dates`, `GET /insurance/expiring`, `GET /orders/{orderId}/insurance-history`
- **Stage docs**: `POST /stage-documents/{id}/upload`
- **Billing notes / stage skips / misc docs**: full CRUD under `/orders/{orderId}/*`
- **Simple uploads**: Bulk Invoice, Bulk Invoice Zip, Form 21/22, RTO Excel, Insurance Excel
- **List endpoints**: every `list*` fn on the frontend has a matching GET

## Fully-migrated flows

Every stage now runs on the .NET backend. There are no more `501 Not
Implemented` responses. Ported in the latest round:

- `POST /orders/{id}/pdi/initial` — parses the PDI .xlsx with ClosedXML,
  creates one vehicle per row, splits the `SIX SENSE-` column on `|` into
  `iot_imei` / `iot_sim`, and sets `vendor_flagged` when the sheet mixes
  Customer/Vendor values.
- `POST /orders/{id}/pdi/final` — matches existing vehicles by VIN, updates
  registration + policy fields only, reports unmatched VINs, and flags
  per-row vendor mismatches.
- `POST /orders/{id}/final-pdi/verify` — recomputes the pass/fail report
  (registration required unless low-speed, policy required, vendor flag
  must be clean).
- `POST /orders/{id}/invoices/individual/preview` + `/confirm` — filename
  substring match against vehicle VIN.
- `POST /orders/{id}/rto/slips/preview` + `/confirm` — filename substring
  match against vehicle Registration Number.
- `POST /orders/{id}/insurance/policies/preview` + `/confirm` — filename
  substring match against vehicle Policy Number.
- `POST /orders/{id}/download-zip` — streams a single ZIP built from every
  file stored against the order (stage docs, PDI sheets, bulk/individual
  invoices, RTO slips, insurance policies), returned as base64 so the
  browser can save it directly.
- `POST /orders/{id}/rto/excel` and `/insurance/excel` — now actually parse
  the uploaded sheet and update vehicles by VIN.

## Migrating from an existing Supabase deployment

The importer CLI has three data-migration subcommands:

```bash
# 1. Copy every business table (UUIDs preserved, idempotent)
dotnet run --project src/NimboB2B.Import -- import-db \
  --source-conn "Host=db.<project>.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=<db-pw>"

# 2. Copy every object from Storage into the local file store,
#    then rewrite file_url columns to signed local URLs
export FILE_ROOT=/var/lib/nimbob2b/files
export PUBLIC_URL=https://api.nimbob2b.example
dotnet run --project src/NimboB2B.Import -- import-files \
  --source-url https://<project>.supabase.co \
  --service-key "<service-role-key>" \
  --bucket nimbo-files --bucket database_export_03_07_26

# 3. Bulk-create users (email,name,role,temp_password CSV)
dotnet run --project src/NimboB2B.Import -- create-users --csv users.csv
```

The Supabase `auth.users` table is NOT copied — passwords there are hashed
with a Supabase-specific scheme. Give every user a temp password via
`create-users`; they change it through `POST /auth/change-password`.
