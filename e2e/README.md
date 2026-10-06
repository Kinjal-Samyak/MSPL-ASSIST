# MSPL Assist browser E2E tests

This Playwright project validates the application only in the dedicated Training environment. It uses the real browser login flow and never injects tokens into browser storage.

## Safety model

`global.setup.ts` refuses to start unless all of the following are true:

- `MSPL_RUNTIME_ENV=training`
- `E2E_RESET_TRAINING_DB=true`
- `E2E_TRAINING_DATABASE_URL` is a PostgreSQL URL with a database name containing `training`
- frontend, API, and all role credentials are provided
- the API health endpoint and Login page are reachable

Before tests, setup recreates only the `public` schema in the verified Training database, replays all existing migrations, runs the normal seed, and then runs the explicitly-gated development/training seed. This keeps state-changing tests deterministic without adding a delete endpoint or altering application workflows. The reset is guarded by the Training database-name check and `E2E_RESET_TRAINING_DB=true`.

## Smoke Gate

The global setup is the mandatory Smoke Gate. It runs before Playwright schedules any of the functional tests and writes `reports/smoke.json`.

- Backend reachable
- API health endpoint responds successfully
- Verified Training database reset, migration, and seed complete
- Frontend reachable
- Login page renders
- Logged-in Training Environment indicator renders

Any failed check stops the suite immediately. Functional tests never execute after a failed Smoke Gate.

## Run locally

1. Copy `.env.example` to `.env` inside this directory and set the Training administrator password.
2. Start the backend with the Training database and `MSPL_RUNTIME_ENV=training`.
3. Build/start the frontend with `VITE_MSPL_RUNTIME_ENV=training` and `VITE_API_BASE_URL` pointing to that backend.
4. Install dependencies and Chromium:

   ```powershell
   npm install --prefix e2e
   npm run install:browsers --prefix e2e
   ```

5. Load the environment variables in your shell and run:

   ```powershell
   npm test --prefix e2e
   ```

Reports are written to `e2e/reports/`:

- `html/` — Playwright HTML report
- `results.json` — JSON result report
- `results.xml` — JUnit report
- `timings.json` — browser timing measurements
- `run-summary.json` — teardown summary and diagnostics
- `smoke.json` — mandatory environment preflight result
- `test-results/` — failed-test screenshots, videos, and traces

## CI lifecycle

`Build → Deploy Training → Migrate/seed in global setup → Run Playwright → Collect reports → Destroy/reset Training database`.

The project runs one browser worker because ticket, assignment, and technician workflow scenarios use shared Training data. Retries are enabled only in CI and retain failure artifacts.

## Locator policy

Tests use accessible names, labels, headings, and existing semantic roles. No application `data-testid` attributes were added. If a future UI change makes a selector unstable, add a narrowly scoped test ID only after documenting why the accessible selector is insufficient.
