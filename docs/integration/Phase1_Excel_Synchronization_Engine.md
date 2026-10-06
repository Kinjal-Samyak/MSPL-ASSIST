# Phase 1 - Excel Synchronization Engine

## Scope

Phase 1 engine + Milestone 2 integration/stabilization for Excel sources:

1. Master Deployment
2. Inventory_NSPL

No frontend integration is included. Existing module contracts remain unchanged.

## Architecture

Sync Engine  
-> Excel Reader  
-> Validation Layer  
-> Mapping Layer  
-> Sync Service  
-> PostgreSQL (snapshot persistence in AppSetting)  
-> Operational Providers (Deployment/Inventory/Lookup reads from synchronized snapshot datasource)

## Implemented Components

- `ExcelWorkbookLoader`
- `ExcelSheetParser`
- `ExcelReaderService`
- `ExcelSyncRowMapper`
- `ExcelSyncValidationService`
- `ExcelSyncRepository`
- `ExcelSynchronizationService`
- `ExcelSynchronizationEngine`
- `ExcelSyncLogger`
- `IntervalSyncScheduler` + `NoopSyncScheduler`
- Sync DTOs and interfaces
- `SyncedOperationalDataSource` (provider integration)
- `SyncController` + `/api/v1/sync/*` routes
- `SyncRepository` + `SyncService` (status/history/manual run orchestration)

## Business Rules

Master Deployment processing enforces:

- For riders with multiple deployments, select latest ACTIVE/PENDING deployment as latest.
- If no active deployment exists, select latest deployment by deployment date.

## Sync Behavior

Each run captures:

- Rows Read
- Rows Inserted
- Rows Updated
- Rows Skipped (duplicates/invalid/unchanged)
- Rows Failed (unexpected persistence errors)
- Execution Time (ms)

## Scheduler

Environment-driven scheduler modes:

- `FIVE_MINUTES`
- `FIFTEEN_MINUTES`
- `HOURLY`
- `MANUAL`

Scheduler can be disabled using `EXCEL_SYNC_SCHEDULER_ENABLED=false`.

## API Endpoints

- `POST /api/v1/sync/run` - manual sync trigger
- `GET /api/v1/sync/status` - current and next sync state
- `GET /api/v1/sync/history` - previous executions

## Error Handling and Recovery

- Duplicate/invalid rows are skipped and logged.
- Row-level persistence errors are captured without stopping full execution.
- Sync status is persisted and exposed through status/history endpoints.
