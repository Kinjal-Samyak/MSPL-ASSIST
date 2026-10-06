# MSPL Assist - UAT Tracker

## Purpose

Use this tracker in a controlled UAT environment. Status values are `NOT TESTED`, `PASS`, `FAIL`, `BLOCKED`, or `N/A`. Record a test account, representative dataset/workbook, date, tester and defect reference for every executed row.

## Entry conditions

- Target backend, PostgreSQL, frontend and Microsoft 365 configuration are available.
- A test ADMIN, COORDINATOR and TECHNICIAN account exist.
- Representative master and inventory workbooks are available in the approved OneDrive/SharePoint location.
- Test data includes active/inactive riders, active/completed deployments, tickets in multiple statuses, and riders with alternate/WhatsApp mobile numbers.

## UAT cases

| ID | Module | Scenario | Expected result | Status | Evidence / defect |
| --- | --- | --- | --- | --- | --- |
| UAT-AUTH-001 | Setup | Bootstrap the first administrator in an empty database | One ADMIN is created; a later bootstrap attempt is rejected. | NOT TESTED | |
| UAT-AUTH-002 | Auth | Login with an active valid user | Portal session starts and protected UI is available. | NOT TESTED | |
| UAT-AUTH-003 | Auth | Login/refresh/logout failure cases | Invalid, expired or revoked tokens are rejected and session is cleared. | NOT TESTED | |
| UAT-AUTH-004 | Access | Test endpoint access as unauthenticated, ADMIN, COORDINATOR and TECHNICIAN users | Results match the agreed RBAC matrix. Current implementation must be reviewed before sign-off. | NOT TESTED | |
| UAT-CUST-001 | Rider | Search by rider ID, Rider Name, Rider Phone Number, alternate mobile and WhatsApp number | Search returns the matching rider, hub and active-deployment count with correct paging. | NOT TESTED | |
| UAT-CUST-002 | Rider | Create and update rider | Valid data persists and duplicate Rider Phone Number is rejected. | NOT TESTED | |
| UAT-CUST-003 | Rider | Deactivate rider with an active deployment or open ticket | Deactivation is rejected with a clear validation message. | NOT TESTED | |
| UAT-CUST-004 | Rider | Open profile, timeline, rental history, active vehicles and documents | Each view returns data scoped to the selected rider. | NOT TESTED | |
| UAT-CUST-005 | Customer identity | Sync same phone with changed rider name, then same rider name with a different phone | Same phone updates one Customer; same name/different phone results in distinct Customers and customer-linked records follow phone identity. | NOT TESTED | |
| UAT-VEH-001 | Vehicle | Search/list vehicles by operational attributes | Paging/filtering/sorting and inventory-derived values are correct. | NOT TESTED | |
| UAT-VEH-002 | Vehicle | View vehicle deployment/service/history/status/health data | Details agree with synced operational data and ticket history. | NOT TESTED | |
| UAT-VEH-003 | Vehicle | Attempt to deactivate a vehicle with active deployment | Request is rejected; verify expected persistence behavior for allowed deactivation. | NOT TESTED | |
| UAT-DEP-001 | Deployment | Search/list/deployment dashboard | Counts, filters, current status and displayed customer/vehicle/hub information are correct. | NOT TESTED | |
| UAT-DEP-002 | Deployment | Close and reopen deployment | Lifecycle operation succeeds only under agreed conditions and audit/UI state is correct. | NOT TESTED | |
| UAT-TKT-001 | Ticket | Create ticket for a valid customer/deployment | Unique ticket number, primary issue, issue items, history and activity are created. | NOT TESTED | |
| UAT-TKT-002 | Ticket | Create another active ticket for same customer | Existing ticket is returned; duplicate active ticket is not created. | NOT TESTED | |
| UAT-TKT-003 | Ticket | Exercise every permitted status transition | State and audit records update for each valid transition. | NOT TESTED | |
| UAT-TKT-004 | Ticket | Attempt invalid status transition | State remains unchanged and request is rejected. | NOT TESTED | |
| UAT-TKT-005 | Ticket | Add comment/attachment, technician, ETA and charges | Ticket workspace and API reflect each change accurately. | NOT TESTED | |
| UAT-WRK-001 | Workshop | Create, update, assign, start, complete and cancel workshop job | Workflow behavior, permissions and timeline entries are correct. | NOT TESTED | |
| UAT-NOT-001 | Notifications | Configure template/channel and send notification | Template rendering and message record are correct. | NOT TESTED | |
| UAT-NOT-002 | Notifications | Simulate failed notification delivery | Failure is recorded and visible; confirm expected retry behavior. | NOT TESTED | |
| UAT-GRAPH-001 | Graph OAuth | Authorize Microsoft 365 from Settings | Browser returns to settings; encrypted tokens persist and Graph status is authenticated. | NOT TESTED | |
| UAT-GRAPH-002 | OneDrive | Browse drives/folders and select workbooks | Folders and supported Excel files are navigable; correct IDs/URLs are saved. | NOT TESTED | |
| UAT-SYNC-001 | Wizard | Validate workbooks, load sheets/headers, detect mapping | Returned worksheet/header/mapping data matches selected workbooks. | NOT TESTED | |
| UAT-SYNC-002 | Wizard | Preview valid configuration | Match/duplicate/missing-key and validation counts are credible against source data. | NOT TESTED | |
| UAT-SYNC-003 | Sync | Save configuration and execute manual sync | Expected customers, hubs, models and deployments are inserted/updated; history/status are recorded. | NOT TESTED | |
| UAT-SYNC-004 | Sync | Run with duplicate/invalid rows | Errors are observable and outcome matches the approved partial-versus-atomic import policy. | NOT TESTED | |
| UAT-SYNC-005 | Scheduler | Enable schedule and observe scheduled execution | One scheduler becomes active, next run is shown, and history records execution. | NOT TESTED | |
| UAT-SYNC-006 | Rider account status | Sync riders with one plan Active, one plan Closed, multiple plans, historical Closed then later Active, latest Closed, missing/invalid End Dates, and exchanged vehicles | Only the latest valid End Date row determines account/customer/deployment status. Exactly `Closed a/c` produces logical CLOSED (persisted as INACTIVE/COMPLETED); every other latest value produces ACTIVE/ACTIVE. | NOT TESTED | |
| UAT-SYNC-007 | Rider current assignment | Sync a normal rider, exchange, upgrade, and multiple Plan Start records | Current Plan Start, Current MV Track No., hub, model, and MotorNo.-derived vehicle come only from the latest valid FDD Status `Plan Start` row. Account status remains independently derived from latest valid End Date. | NOT TESTED | |
| UAT-REP-001 | Reports | Verify report/dashboard filtering and export | Totals and exported data agree with visible operational/ticket records. | NOT TESTED | |
| UAT-CONV-001 | Conversation | Run customer conversation flow through ticket confirmation | State transition, expiry, and ticket output are correct; transport integration status is documented. | NOT TESTED | |

## Current test strategy assessment

Backend tests use Jest/ts-jest, Supertest and separate unit/integration configuration. The repository currently contains backend tests across validators, services, repositories, controllers, conversations, Excel sync, providers and integration workflows. CI runs Prisma validation/generation, builds both applications, then executes backend unit/integration/API commands and coverage collection.

The standard unit configuration enforces global coverage thresholds of 80% statements/lines/functions and 50% branches for its configured collection. Existing documentation reports historical combined coverage above the statement/line threshold, but UAT must not treat that historical number as a current execution result. No application-owned frontend test suite was found.

## UAT exit criteria

1. All critical UAT cases pass: authentication, UAT-CUST-001, ticket creation/lifecycle, Graph authorization, workbook configuration and synchronization.
2. No open critical or high-severity defect exists.
3. The approved RBAC matrix has been verified against every mutating endpoint.
4. Sync behavior under bad data, duplicate keys and reruns is accepted in writing.
5. Business owners acknowledge current external-integration limitations: simulated notifications and absent WhatsApp transport endpoint.
6. Evidence includes source workbook version, selected sheet/mapping, sync history ID, resulting records and tester sign-off.

## Known UAT blockers / decision gates

- Reconcile ticket transition names with seeded status masters before testing the entire lifecycle.
- Define expected import atomicity before accepting partial-import test outcomes.
- Confirm whether production environments must supply Microsoft 365 credentials at server startup.
- Agree route-level authorization expectations before treating access-control outcomes as defects or accepted behavior.
