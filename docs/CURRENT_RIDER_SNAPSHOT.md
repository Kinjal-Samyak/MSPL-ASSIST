# Current Rider Snapshot

## Purpose

The Current Rider Snapshot is the single persisted operational view of one Rider. It prevents application modules from scanning workbook history and reimplementing Rider rules independently.

## Snapshot schema

One JSON snapshot is persisted for each Rider Phone Number in the existing `AppSetting` store under category `CURRENT_RIDER_SNAPSHOT` and key `current-rider:<phone>`. No database migration or API-contract change is required.

| Field | Source rule |
| --- | --- |
| Rider Phone Number | Canonical grouping and persistence key |
| Rider Name | Latest Current Rental Plan display value |
| Current Account Status | Latest valid End Date record's Paid Status |
| Current MV Track No. | Latest valid `FDD Status = Plan Start` record |
| Current MotorNo. / Assigned Vehicle | Inventory MotorNo. matched from the distinct Master Deployment MotorNo. value |
| Current Model / Hub | Inventory match, falling back to the Current Rental Plan hub |
| Current Plan Start Date | Latest valid `Plan Start` Start Date |
| Latest Rental Plan End Date / Paid Status | Latest valid End Date record |
| Current Deployment Status | `ACTIVE` unless latest Paid Status is exactly `Closed a/c`, then `COMPLETED` |

## Data flow

```text
Excel -> mapping -> validation -> operational source snapshots
      -> centralized Rider assignment resolver
      -> current rider snapshots (one per Rider Phone Number)
      -> Customer/Deployment persistence and operational providers
      -> Riders, deployments, dashboard, workshop, tickets, notifications, analytics
```

## Business rules

- Current assignment and account status are intentionally independent.
- Current assignment uses only the latest valid `Plan Start` record by Start Date. Exchange and Upgrade records are valid plan starts.
- Synchronization deduplicates Master Deployment MotorNo. values and joins each one to Inventory MotorNo. Missing values are logged and excluded without stopping the run.
- Account status uses only the record with the latest valid End Date. `Closed a/c` maps to persisted Customer `INACTIVE` and Deployment `COMPLETED`; every other value maps to `ACTIVE`.
- Rider Name is never an identity key; Rider Phone Number is the sole business key.

## Dependencies and consumers

`CurrentRiderSnapshotService` owns persistence and retrieval. `SyncedOperationalDataSource` reads the persisted snapshot first. The synchronization persistence service computes fresh snapshots once, persists them after joined-record processing, and all provider-backed Rider, deployment, vehicle, workshop, ticket, notification, report, and future WhatsApp/coordinator consumers inherit that projection.

Before the first completed synchronization, the datasource can calculate a temporary projection from source snapshots for compatibility. This fallback is not used once persisted Current Rider Snapshots exist.
