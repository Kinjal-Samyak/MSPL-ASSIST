# NimboB2B — Part B (Reported Bugs) — Change Log

Date: 2026-08-28
Scope: the five reported bugs only, plus one pre-existing TypeScript build error.

---

## B0. Build error — `expired` search param (pre-existing)

`src/routes/auth.tsx` declared `expired` as always present, so every route that
navigated to `/auth` was required to pass it. It is now genuinely optional.

- `src/routes/auth.tsx` — `validateSearch` returns `{ expired?: "1" }`.

---

## B1. Friendly max-length validation messages

Users saw raw messages such as *"String must contain at most 120 character(s)"*.

- **New** `src/lib/field-limits.ts` — single source of truth for every field
  cap plus `maxLenMsg()` / `requiredMsg()` helpers
  (e.g. *"Client name must be 120 characters or fewer."*).
- **New** `src/components/limited-input.tsx` — `LimitedInput` / `LimitedTextarea`
  hard-cap the field, show a live `n / max` counter (grey → amber near the cap →
  red at the cap) and the plain-English message when the cap is reached.
- Human messages attached to every string rule in:
  - `src/lib/orders.functions.ts`
  - `src/lib/billing-notes.functions.ts`
  - `src/lib/stage-docs.functions.ts`
  - `src/lib/stage-ops.functions.ts`
  - `src/lib/insurance.functions.ts`
  - `src/lib/vehicles.functions.ts`

## B2. Downloaded file name differs from the original

The disk name is `<guid>-<original>`; that leaked into downloads.

- `backend/.../Storage/IFileStore.cs` — `CreateDownloadUrl` now takes an
  optional `displayName`.
- `backend/.../Storage/LocalFileStore.cs` — the display name is carried in the
  link and covered by the HMAC signature (`SignPayload`); legacy links without
  a name still verify.
- `backend/.../Controllers/FilesController.cs` — responds with
  `Content-Disposition: attachment; filename="Nimbo-<original file name>"`,
  a correct content type per extension, and falls back to stripping the guid
  prefix for older links.
- `backend/.../Services/FileWire.cs`, `.../Services/OrderService.cs` — every
  projection passes the stored `FileName` into the signed link.

## B3. Billing Party "Save" always enabled

- `src/routes/_authenticated/orders.$orderId.tsx` — `BillingNotesPanel` tracks
  the last persisted value; Save is disabled (and reads "Saved") until the text
  actually differs, and re-arms after a successful save. The textarea is now a
  `LimitedTextarea` with a character counter.

## B4. View/Download stops working after one or two clicks

Root cause: the signed URL was baked into the page payload, so once the query
cache was reused the UI kept replaying a stale link; nothing ever re-minted one.
Two secondary hazards were fixed at the same time — a non-shared file handle and
cacheable download responses.

- `backend/.../Controllers/FilesController.cs` — new authorized
  `GET /api/v1/files-sign?path=&name=` endpoint that mints a fresh 15-minute
  link; download responses now send `Cache-Control: no-store` and support
  range requests.
- `backend/.../Storage/LocalFileStore.cs` — reads use
  `FileShare.ReadWrite | FileShare.Delete`, so a concurrent or aborted download
  can never lock the file.
- `backend/.../Services/FileWire.cs`, `OrderService.cs` — each file row also
  exposes `file_path` (storage-relative, no base URL).
- **New** `src/lib/files.functions.ts` — `getFileUrl` server function.
- `src/components/download-link.tsx` — View and Download are now buttons that
  resolve a brand-new URL on every click (falling back to the embedded link),
  with a spinner and a friendly error toast.
- `src/routes/_authenticated/orders.$orderId.tsx`,
  `src/routes/_authenticated/vehicles.$vehicleId.tsx` — pass `file_path` to
  every `DownloadLink`.

## B5. Uploaded insurance policy not shown as the policy document

Root cause: `ConfirmInsurancePolicyUploadAsync` wrote only the order-level
`insurance_policies` row and never touched `vehicle_insurance_policies`, which
is what the vehicle detail page and Insurance History read.

- `backend/.../Services/InsuranceService.cs` — new
  `AttachPolicyFileAsync(...)` upserts the document onto the vehicle's current
  policy record (creating one, and superseding an older policy number, when
  needed), plus `BackfillVehiclePoliciesAsync()` — an idempotent backfill that
  links already-uploaded order-level files by policy number.
- `backend/.../Services/StageOpsService.cs` — the insurance confirm step now
  calls the linker for each matched vehicle.
- `backend/.../Controllers/InsuranceController.cs` — admin/Rajat-only
  `POST /api/v1/insurance/backfill-vehicle-policies`.

No schema change was required.

---

## Files changed

**Backend**
- `backend/src/NimboB2B.Api/Controllers/FilesController.cs`
- `backend/src/NimboB2B.Api/Controllers/InsuranceController.cs`
- `backend/src/NimboB2B.Infrastructure/Storage/IFileStore.cs`
- `backend/src/NimboB2B.Infrastructure/Storage/LocalFileStore.cs`
- `backend/src/NimboB2B.Application/Services/FileWire.cs`
- `backend/src/NimboB2B.Application/Services/OrderService.cs`
- `backend/src/NimboB2B.Application/Services/InsuranceService.cs`
- `backend/src/NimboB2B.Application/Services/StageOpsService.cs`

**Frontend**
- `src/lib/field-limits.ts` *(new)*
- `src/components/limited-input.tsx` *(new)*
- `src/lib/files.functions.ts` *(new)*
- `src/components/download-link.tsx`
- `src/lib/orders.functions.ts`
- `src/lib/billing-notes.functions.ts`
- `src/lib/stage-docs.functions.ts`
- `src/lib/stage-ops.functions.ts`
- `src/lib/insurance.functions.ts`
- `src/lib/vehicles.functions.ts`
- `src/routes/_authenticated/orders.$orderId.tsx`
- `src/routes/_authenticated/vehicles.$vehicleId.tsx`
- `src/routes/auth.tsx`

**Docs**
- `docs/CHANGES-2026-08-28-part-b.md` *(this file)*

---

## Verify locally

```bash
cd backend
dotnet build src/NimboB2B.Api/NimboB2B.Api.csproj
dotnet run --project src/NimboB2B.Api/NimboB2B.Api.csproj      # http://localhost:5080
```

Then, in the app:

1. Type past a field's cap — the counter turns red and a sentence explains the limit.
2. Download any document — the saved file is `Nimbo-<original name>`.
3. Open Billing Party Details — Save reads "Saved" and is disabled until you edit.
4. Click View/Download on the same file five times — every click works.
5. Upload an insurance policy PDF in the Insurance stage — it appears on the
   matched vehicle's detail page. For files uploaded before this fix, call
   `POST /api/v1/insurance/backfill-vehicle-policies` once as an admin.
