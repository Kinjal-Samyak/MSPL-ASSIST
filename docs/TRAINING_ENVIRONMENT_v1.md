# Training Environment v1

## Purpose

Training is a separate deployment of the same MSPL Assist application used for demonstrations, onboarding, and user practice without creating operational evidence. It is environment-based; no business rule depends on a training user's email, name, or role.

## Shared application model

Live and Training use one frontend codebase, one backend codebase, one Prisma schema, one API surface, one authentication/RBAC implementation, and one set of business workflows. Training has no feature-specific modules, routes, or UI. A feature added to MSPL Assist is therefore available to both deployments automatically.

Only deployment configuration differs: `DATABASE_URL`/`DIRECT_URL`, `MSPL_RUNTIME_ENV`, Microsoft Graph/workbook credentials and configuration, notification delivery policy, and the frontend API base URL.

## Required deployment boundary

A Training deployment must use a dedicated PostgreSQL database and set `MSPL_RUNTIME_ENV=training`. Production uses `MSPL_RUNTIME_ENV=production` and a separate database. Startup rejects Training when the database name is not identified as Training, and rejects Production when it points to a Training database. This database boundary is the mechanism that prevents Training tickets, activity, KPI calculations, searches, reports, exports, and audit records from reaching Production.

`NODE_ENV` is not the business-environment selector. It remains available for framework behavior; `MSPL_RUNTIME_ENV` controls Training policy.

## Training accounts

| Role | Email | Default password |
| --- | --- | --- |
| Administrator | Existing training administrator | Existing training password |
| Coordinator | `coordinator@msplassist.local` | `coordinator@1234` |
| Technician | `technician@msplassist.local` | `technician@1234` |

These accounts are created only by the explicitly gated development/training seed. They must not be seeded into Production.

## Data, reporting, and audit behavior

All data in the dedicated Training database is Training Data. Training dashboards may use it for demonstrations. Production dashboards, reports, KPIs, SLA calculations, searches, exports, compliance evidence, and performance metrics cannot access it because they connect only to the Production database.

Training activity remains available in the Training database for troubleshooting. Application logs identify suppressed notification activity with `runtimeEnvironment: "training"`.

## Notification policy

In Training Mode, `NotificationService` retains a notification log with status `NOT_SENT`, a `training-suppressed` response identifier, and a suppression reason. It does not invoke any channel adapter. This covers WhatsApp, SMS, Email, In-App, and future outbound channel adapters that use the service.

The same frontend can point to both deployments through `VITE_LIVE_API_BASE_URL` and `VITE_TRAINING_API_BASE_URL`. The login health check verifies that the selected endpoint reports the matching runtime before permitting sign-in. The Training web experience displays a persistent Training Environment indicator after sign-in.

## Operational safeguards

- Never share a database, Graph workbook configuration, or outbound-provider credentials with Production.
- Use the same Graph and Operational Data Wizard services, configured against a separate Training workbook and credentials where required.
- RBAC is unchanged: only the data environment and outbound-delivery policy differ.
