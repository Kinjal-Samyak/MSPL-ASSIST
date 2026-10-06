# MSPL Assist — Deployment Guide

Target architecture: **Vercel** (frontend), **Render** (Node.js Web Service, backend),
**Supabase PostgreSQL** (database), **Supabase Storage** (file storage), **GitHub** (source +
Render/Vercel auto-deploy trigger).

---

## 1. Prerequisites

- A GitHub repository connected to both Render and Vercel.
- A Supabase project with:
  - The **Transaction Pooler** connection string (port `6543`) — becomes `DATABASE_URL`.
  - The **Session Pooler** connection string (port `5432`) — becomes `DIRECT_URL`. See §4 for why
    both are required.
- Two freshly generated JWT secrets:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
  Run twice — `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be distinct.
- Azure App Registration values for Microsoft Graph (`M365_TENANT_ID`, `M365_CLIENT_ID`,
  `M365_CLIENT_SECRET`, `M365_REDIRECT_URI`, `M365_SCOPES`, `M365_TOKEN_ENCRYPTION_KEY`) — the
  server refuses to start without all six, even if the Operational Data Wizard isn't in active use
  for this deployment.

---

## 2. Create the Render Web Service

This repository includes a [`render.yaml`](render.yaml) Blueprint at the repo root, so the
fastest path is:

1. In the Render Dashboard: **New → Blueprint**, select this GitHub repository, branch `main`.
2. Render reads `render.yaml` and proposes one Web Service, `mspl-assist-backend`. Review and
   click **Apply**.
3. Render will pause at deploy because the `sync: false` environment variables (secrets) are not
   set yet — continue to §3.

**If configuring manually instead** (Dashboard → New → Web Service, no Blueprint):

| Setting | Value |
|---|---|
| Repository / Branch | this repo / `main` |
| Runtime | Node |
| Region | closest to your users |
| Build Command | `npm install --include=dev && npm run build:shared && cd backend && npm install --include=dev && npm run prisma:generate && npm run build` |
| Start Command | `cd backend && npm run start` |
| Health Check Path | `/health` |
| Auto-Deploy | On (deploys on every push to `main`) |

The `--include=dev` flags matter: Render applies this service's environment variables — including
`NODE_ENV=production`, which the app needs at runtime — to the **build** phase too. A plain
`npm install` under `NODE_ENV=production` silently skips `devDependencies`, which would strip
`typescript` (breaking `npm run build`) and the `prisma` CLI (breaking `prisma generate`).
`@prisma/client` itself is a regular dependency and is unaffected — only the CLI is at risk.

---

## 3. Set environment variables

In the Render service's **Environment** tab, set every variable listed as `sync: false` in
`render.yaml` (Render does not store secret values in the Blueprint file itself):

| Variable | Source |
|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler string, port `6543`, with `?pgbouncer=true&sslmode=require` |
| `DIRECT_URL` | Supabase Session Pooler string, port `5432`, with `?sslmode=require` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Generated in §1 |
| `DEFAULT_ADMIN_PASSWORD` | Only consumed by the seed script — set to a real value if you plan to run it |
| `CORS_ALLOWED_ORIGINS` | Your Vercel frontend URL(s), comma-separated, no trailing slash |
| `M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_REDIRECT_URI`, `M365_TOKEN_ENCRYPTION_KEY` | Azure App Registration |

Every other variable (`NODE_ENV`, `MSPL_RUNTIME_ENV`, rate-limit tuning, JWT TTLs, `M365_SCOPES`,
`CONVERSATION_SESSION_TIMEOUT_HOURS`) already has a production-appropriate value baked into
`render.yaml`. `PORT` is injected by Render automatically — never set it yourself.

Full documentation for every variable, including local-development defaults, is in
[`backend/.env.example`](backend/.env.example).

---

## 4. Run the Prisma migration

`schema.prisma`'s datasource declares both `url` (from `DATABASE_URL`) and `directUrl` (from
`DIRECT_URL`). This is a **Supabase pooling requirement, not a hosting-platform one** — it applies
identically on Render, Oracle, or anywhere else Prisma talks to a pooled Supabase connection:
Prisma Migrate takes a session-scoped Postgres advisory lock before applying migrations, and the
Transaction Pooler (`DATABASE_URL`) doesn't preserve session state across its pooled connections,
so `migrate deploy` against it alone hangs indefinitely with no error and no migration SQL ever
executing. `directUrl` routes CLI commands around that; the running app never uses it.

Run the migration once per deploy that includes new migrations, from a Render **Shell** session
(Dashboard → your service → **Shell**) so it runs with the same environment variables as
production, or from your local machine with `DATABASE_URL`/`DIRECT_URL` temporarily pointed at
Supabase:

```bash
cd backend
npx prisma validate
npm run prisma:deploy      # prisma migrate deploy - applies all committed migrations in order
```

This is intentionally a manual step, not part of `startCommand` — running migrations automatically
on every restart is avoided so a bad migration can't take down the running service on its own.

---

## 5. Deploy the frontend (Vercel)

In the Vercel project settings for this repository:
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables** (per Vercel environment — Preview/Production):
  - `VITE_API_BASE_URL` and/or `VITE_LIVE_API_BASE_URL` / `VITE_TRAINING_API_BASE_URL` — the
    `https://<your-service>.onrender.com` URL from §2.
  - `VITE_MSPL_RUNTIME_ENV`
  - `VITE_APP_NAME`, `VITE_APP_VERSION` (optional, have defaults)

Vercel builds and deploys on every push to the connected branch. Vite bakes these variables in at
**build time** — changing them requires a redeploy, not just a config change.

---

## 6. Verify

```bash
curl https://<your-service>.onrender.com/health
# {"status":"ok","application":"MSPL Assist","version":"1.0.0","environment":"production"}
```

`GET /health` is a liveness check (no database round-trip, no auth) — it's what Render's
`healthCheckPath` polls to decide whether a deploy is healthy. Then, from a browser, load the
Vercel frontend URL and confirm login works end-to-end (this exercises CORS, JWT issuance, and the
database connection together).

---

## 7. Rollback

**Backend (Render):** Dashboard → your service → **Events/Deploys** tab → find the last known-good
deploy → **Rollback to this deploy**. Render keeps previous builds available for instant rollback;
no rebuild needed.

If the rollback also needs a schema rollback, Prisma migrations are forward-only by design —
restoring from a pre-migration Supabase backup (Supabase Dashboard → Database → Backups) is the
supported path, not an auto-generated down-migration.

**Frontend (Vercel):** Dashboard → **Deployments** → (previous deployment) → **Promote to
Production** — instant, no rebuild needed.

---

## Known limitations at this stage

- Rate limiting and any other in-memory state assume a **single** instance. Render's autoscaling
  (if enabled beyond one instance) would need a shared store (e.g. Redis) for rate-limit counters
  — not required for a single-instance deployment.
- Supabase Storage integration does not exist yet in the application code — attachment/photo
  upload workflows should stay out of scope until that's built.
- Migrations are applied manually (§4), not as part of the deploy pipeline — deliberate, see §4.
