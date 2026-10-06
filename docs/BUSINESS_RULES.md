# MSPL Assist - Business Rules

## Interpretation

Rules below are verified from current services, validators, repositories and routes. They may differ from legacy documentation; differences and missing decisions are identified at the end.

## Identity, access and setup

- System bootstrap creates the first ADMIN only when the user table is empty.
- Login requires a matching email/password, an active user, and a stored password hash.
- Access and refresh tokens are separate JWTs. Refresh succeeds only for an active user with a matching, unexpired stored refresh-token hash.
- Logout clears the stored refresh token.
- Roles are ADMIN, COORDINATOR and TECHNICIAN.
- Operational-data configuration changes and most Graph wizard operations require ADMIN. Other API groups currently lack equivalent route enforcement; this is an implementation gap, not an approved access policy.

## Rider rules

- Rider is the sole business entity. The legacy `Customer` table is its master persistence representation; legacy Customer endpoint and field names remain for API compatibility.
- Rider Phone Number (`Customer.registeredMobile`) is the canonical identity used by ticket creation and sync persistence. Rider Name is display-only.
- Synchronization never merges records by Rider Name. The same phone updates one rider even if the source name changes; the same name with different phones creates distinct riders.
- Rider search accepts pagination and matches rider ID, name, Rider Phone Number, alternate mobile, and WhatsApp number case-insensitively.
- A rider may not be deactivated when it has an active deployment or open ticket.
- Rider detail/list behavior can accept a viewer context, but API-wide ownership and technician visibility rules are not fully defined.

## Deployment and vehicle rules

- A deployment belongs to one customer, hub and vehicle model and records MV Track number, vehicle number and rental status.
- Operational providers select the most recent active deployment where relevant; otherwise they fall back to the latest deployment.
- Vehicle operational lookup is centered on MV Track number; the provider abstraction can later be supplied by a non-Prisma datasource.
- Sync persistence requires a valid customer mobile, model code, hub, MV Track number and vehicle number before it writes a joined deployment record.
- Vehicle deactivation is rejected when an active deployment exists; the current service does not persist a separate vehicle-state change.

## Ticket rules

- Ticket creation requires an existing customer, issue category and the `Open` status master.
- A customer may have only one active ticket. A creation request for a customer with an existing active ticket returns that ticket rather than creating a duplicate.
- A ticket can be linked to a matching customer deployment. `deploymentVerified` is true only when deployment lookup succeeds.
- Ticket number creation and ticket/history/activity creation occur inside the ticket-creation transaction.
- Tickets can carry a primary issue category and multiple issue items.
- Ticket comments, attachments, technician assignment, ETA, charges and status changes are individual operations.
- Status transition service rules are:

| Current | Allowed next |
| --- | --- |
| Open | Assigned, Cancelled |
| Assigned | Inspection, In Progress, Cancelled |
| Inspection | In Progress, Waiting For Parts, Cancelled |
| In Progress | Waiting For Parts, Ready, Cancelled |
| Waiting For Parts | In Progress, Ready, Cancelled |
| Ready | Delivered, Cancelled |
| Delivered | Closed |
| Closed or Cancelled | None |

## Workshop and notification rules

- Workshop job creation requires a valid deployment, issue category, and an `Open` status.
- Workshop job edits/assignment are blocked after terminal lifecycle states by the workshop service.
- Notification event type must match the source module; the source record must exist.
- A notification channel must be enabled before sending.
- An optional template must be active and match the event type/channel.
- The current delivery adapters are simulated: a recipient containing `fail` produces a recorded failure; no real WhatsApp, SMS or email delivery is performed.

## Conversation rules

- Conversation sessions persist a WhatsApp number, state, context, timestamps and expiration.
- Sessions expire after `CONVERSATION_SESSION_TIMEOUT_HOURS` (24 by default).
- The implemented flow covers menu, issue category, additional issues, description, photo, mobile/customer/deployment verification, ticket creation and confirmation.
- No transport/webhook boundary for a WhatsApp provider is present in the current HTTP API.

## Workbook and synchronization rules

- The wizard operates on two sources: master deployment and NSPL inventory workbooks.
- Supported workbook extensions are `.xlsx`, `.xlsm` and `.xls`.
- Admin selects worksheets, header row and relationship columns. The intended default relationship is MV Track number to MV Track number.
- Master and inventory header similarity can produce mapping suggestions; manual selections may be saved.
- Master source rows are de-duplicated. For a rider with multiple rows, the row with the latest valid End Date (`returnDate`) is marked as latest and is the sole source for rider account status and derived deployment status. Missing or invalid End Dates are ignored whenever at least one valid End Date exists. Only that row's Paid Status is evaluated: exactly `Closed a/c` means logical CLOSED (persisted as customer INACTIVE and deployment COMPLETED); any other value means ACTIVE/ACTIVE.
- Current Rider assignment is resolved separately. Among rows with FDD Status `Plan Start`, the latest valid Start Date (`deploymentDate`) supplies Current Plan Start Date. Distinct Master Deployment MotorNo. values are joined to Inventory MotorNo.; a successful join supplies Current MV Track No., hub, model, and current vehicle. Exchange and Upgrade rows are valid plan starts. Missing MotorNo. values are logged without stopping synchronization and do not create snapshots.
- After a successful synchronization, one Current Rider Snapshot is persisted per Rider Phone Number. Riders, deployments, dashboard/provider, workshop, ticket, notification and analytics consumers must use this snapshot instead of independently re-evaluating rider history.
- Inventory source rows are de-duplicated by MV Track number.
- Invalid rows are skipped/reported. Unexpected persistence errors are counted as failures.
- Joined rider assignments normalize relationship values before matching inventory and master rows.
- Scheduler modes are MANUAL, FIVE_MINUTES, FIFTEEN_MINUTES, THIRTY_MINUTES, HOURLY and DAILY.
- One PostgreSQL advisory lock is used to make a single scheduler instance active.

## Ambiguities requiring product approval

1. The ticket transition map and seed status names differ (`Ready` vs `Ready for Delivery`, `Delivered` vs `Completed`, plus statuses not in the map). The approved lifecycle must be reconciled.
2. Legacy documents describe optimistic locking; `Ticket.rowVersion` exists but explicit version checks/increments are not visible in the ticket update service path.
3. Design material promises atomic imports; the current sync persistence is per joined row, allowing partial success.
4. The source authority and conflict rule for synchronized versus manually changed operational data are unspecified.
5. Notification retry behavior is represented in settings but no worker/provider retry implementation was found.
