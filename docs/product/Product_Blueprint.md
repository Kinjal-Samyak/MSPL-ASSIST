# MSPL Assist — Product Blueprint

## Document Control
- **Product**: MSPL Assist
- **Domain**: EV Fleet Operations SaaS
- **Version**: 1.0 (Blueprint)
- **Audience**: Product Managers, Solution Architects, Engineering, QA, UX
- **Purpose**: Define the complete product design before implementation.

---

## 1) Navigation Map

### Primary Navigation
- Dashboard
- Tickets
- Customers
- Vehicles
- Deployments
- Reports
- Analytics
- Settings

### Secondary Navigation
- Ticket details tabs: Overview, Issue Items, Timeline, SLA, Notes, Attachments
- Customer details tabs: Profile, Fleet, Contracts, Ticket History
- Vehicle details tabs: Profile, Warranty, Service History, Deployments
- Reports filters: Date Range, Hub, Customer, Vehicle Segment, SLA Status

### Utility Navigation
- Global search
- Notifications center
- User profile menu
- Help/Support
- Org switcher (multi-tenant)

---

## 2) User Roles

1. **Platform Admin**
   - Tenant-level configuration, user administration, policy setup.
2. **Operations Manager**
   - Oversees KPIs, SLA compliance, workload balancing, escalation.
3. **Service Coordinator**
   - Creates/updates tickets, assigns technicians, tracks progression.
4. **Field Technician**
   - Executes assigned work, updates status, logs completion notes.
5. **Fleet Supervisor (Customer-side)**
   - Raises requests, views fleet/ticket state, receives updates.
6. **Read-Only Executive**
   - Dashboard, analytics, reports only.

---

## 3) Screen Inventory

### Global
- Login
- Password Reset
- 404 / 500
- Profile & Preferences

### Operations
- Executive Dashboard
- Ticket List
- Ticket Create
- Ticket Detail
- Ticket Assignment Board
- SLA Monitor

### Master/Entity Management
- Customer List / Detail
- Vehicle List / Detail
- Deployment List / Detail
- Issue Categories
- Hub Management
- Status Management

### Intelligence
- Reports Home
- Report Builder
- Scheduled Reports
- Analytics Workbench

### Administration
- User Management
- Roles & Permissions
- Notification Rules
- Integrations
- Audit Logs
- Tenant Settings

---

## 4) Feature Matrix

| Feature | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Dashboard KPIs | ✓ | ✓ | ✓ | Limited | Limited | ✓ |
| Create Ticket | ✓ | ✓ | ✓ |  | ✓ |  |
| Assign Ticket | ✓ | ✓ | ✓ |  |  |  |
| Update Ticket Status | ✓ | ✓ | ✓ | ✓ | Limited |  |
| View Customer/Fleet | ✓ | ✓ | ✓ | Limited | ✓ | ✓ |
| Reports & Export | ✓ | ✓ | ✓ |  | Limited | ✓ |
| Analytics | ✓ | ✓ | Limited |  |  | ✓ |
| User/RBAC Admin | ✓ |  |  |  |  |  |
| Integration Config | ✓ | Limited |  |  |  |  |

---

## 5) User Journeys

### Journey A: Service Coordinator — Ticket Lifecycle
1. Receives request (WhatsApp/API/manual).
2. Validates customer, deployment, vehicle context.
3. Creates ticket with issue items and severity.
4. Assigns technician and SLA target.
5. Tracks progress; handles escalations.
6. Closes ticket with resolution details.
7. Customer receives confirmation.

### Journey B: Operations Manager — Daily Control Tower
1. Opens dashboard and reviews SLA breach risk.
2. Drills into critical tickets.
3. Rebalances assignments across hubs.
4. Monitors completion trend and utilization.
5. Exports EOD report and escalation summary.

### Journey C: Fleet Supervisor — Request to Resolution
1. Raises ticket.
2. Receives acknowledgement and ticket ID.
3. Monitors updates and ETA.
4. Confirms service completion.
5. Reviews history for audit/compliance.

---

## 6) Module Dependencies

1. **Identity & Access** (foundation)
2. **Master Data** (hubs, categories, statuses)
3. **Customer & Vehicle Registry**
4. **Deployment Registry**
5. **Ticket Engine** (depends on 2,3,4)
6. **Conversation/Notification Engine** (depends on 5)
7. **Dashboard & Analytics** (depends on 5 + telemetry)
8. **Reporting** (depends on historical ticket + fleet data)
9. **Admin & Audit** (cross-cutting)

Dependency rule: no module directly bypasses identity, audit, or validation layers.

---

## 7) Information Architecture

### Core Domains
- **Work Management**: tickets, tasks, SLA, assignment
- **Fleet Operations**: customers, vehicles, deployments
- **Insights**: metrics, trend analytics, reports
- **Governance**: users, permissions, audit, policy

### Data Grouping
- **Transactional**: ticket events, activity timeline
- **Reference**: statuses, issue categories, hubs
- **Analytical**: aggregates, performance snapshots
- **Security**: auth sessions, audit trails

---

## 8) Screen Hierarchy

```text
App
├─ Authentication
│  ├─ Login
│  └─ Reset Password
├─ Operations
│  ├─ Dashboard
│  ├─ Tickets
│  │  ├─ List
│  │  ├─ Create
│  │  └─ Detail
│  ├─ Customers
│  │  ├─ List
│  │  └─ Detail
│  ├─ Vehicles
│  │  ├─ List
│  │  └─ Detail
│  └─ Deployments
│     ├─ List
│     └─ Detail
├─ Insights
│  ├─ Reports
│  └─ Analytics
└─ Administration
   ├─ Users
   ├─ Roles
   ├─ Integrations
   ├─ Audit Logs
   └─ Settings
```

---

## 9) API Mapping (Product-Level)

### Authentication
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Dashboard
- `GET /dashboard/kpis`
- `GET /dashboard/fleet-trend`
- `GET /dashboard/ticket-status`
- `GET /dashboard/issue-categories`
- `GET /dashboard/hub-performance`
- `GET /dashboard/activity-feed`

### Tickets
- `GET /tickets`
- `POST /tickets`
- `GET /tickets/{id}`
- `PATCH /tickets/{id}`
- `POST /tickets/{id}/assign`
- `POST /tickets/{id}/status`

### Fleet Core
- `GET /customers`, `GET /customers/{id}`
- `GET /vehicles`, `GET /vehicles/{id}`
- `GET /deployments`, `GET /deployments/{id}`

### Master Data
- `GET /masters/statuses`
- `GET /masters/issue-categories`
- `GET /masters/hubs`
- `GET /masters/vehicle-models`

### Reporting/Analytics
- `GET /reports`
- `POST /reports/export`
- `GET /analytics/overview`

---

## 10) Permission Matrix

### Permission Scopes
- `ticket:create`, `ticket:read`, `ticket:update`, `ticket:assign`, `ticket:close`
- `customer:read`, `customer:update`
- `vehicle:read`, `vehicle:update`
- `deployment:read`, `deployment:update`
- `report:read`, `report:export`
- `analytics:read`
- `admin:users`, `admin:roles`, `admin:integrations`, `admin:audit`

### Role Mapping
- **Admin**: all scopes
- **Ops Manager**: operational + insights; no tenant security administration
- **Coordinator**: ticket and entity update scopes
- **Technician**: assigned tickets + status update only
- **Fleet Supervisor**: own-org ticket creation/read, limited updates
- **Executive**: dashboard/report/analytics read-only

---

## 11) UI Standards

1. **Design Principles**
   - Minimal, enterprise, low visual noise, high data density.
2. **Layout**
   - Persistent navigation, sticky header, responsive content grids.
3. **Components**
   - Reusable cards, tables, forms, charts, badges, timelines.
4. **Accessibility**
   - WCAG AA contrast baseline, keyboard navigation, ARIA labels.
5. **State UX**
   - Explicit loading, empty, error, partial-data states.
6. **Formatting**
   - Standardized date/time/currency/unit formatting.
7. **Feedback**
   - Inline validation + actionable error messaging.
8. **Dark Mode**
   - Full parity with light mode; no feature regressions.

---

## 12) Mobile Strategy

### Approach
- Responsive web-first for operations visibility.
- Mobile usage optimized for monitoring and lightweight actions.

### Mobile Priorities
- Dashboard KPIs, critical alerts, ticket lookup, status updates.
- Streamlined forms for quick ticket raise/update.
- Progressive disclosure for dense analytics.

### Deferred for Native/Phase-2
- Offline technician workflows
- Background sync
- Camera-first inspection capture
- Push-notification deep-link orchestration

---

## 13) Future Modules

1. Predictive Maintenance Scoring
2. Route/Dispatch Optimization
3. Spare Parts & Inventory
4. Warranty & Claim Management
5. Contract SLA Compliance Engine
6. Cost-to-Serve Intelligence
7. Multi-tenant Benchmarking
8. AI Assistant for Ticket Triage
9. Workflow Automation Builder
10. External Partner Portal

---

## 14) Version Roadmap

### v1.0
- Core ticketing, fleet entities, dashboard, base reporting, RBAC foundation.

### v1.1
- Notification automation, advanced SLA escalations, scheduled exports.

### v1.2
- Analytics drilldowns, anomaly alerts, enhanced audit visibility.

### v1.3
- Integrations maturity (WhatsApp/Excel/Graph workflows hardening).

### v2.0
- Predictive maintenance + optimization + partner ecosystem capabilities.

---

## 15) Release Plan

### Release Model
- Monthly minor release
- Bi-weekly patch windows
- Emergency hotfix lane with rollback readiness

### Stage Gates
1. Product requirement sign-off
2. Architecture and security review
3. UX validation and accessibility check
4. API contract freeze
5. Integration/UAT
6. Production readiness checklist
7. Canary rollout
8. Full rollout + post-release monitoring

### Non-Functional Exit Criteria
- P95 page response SLA met
- Error budget within threshold
- Audit logging complete for critical actions
- No critical/high security defects open
- Rollback script validated

---

## Appendix: Implementation Guidance for New Developers

- Build by modules in dependency order (identity → master data → entities → ticket engine → dashboard/insights).
- Keep all APIs contract-first and strongly typed.
- Implement role-based guardrails at route, API, and action levels.
- Ensure all screens include loading/empty/error states before feature completion.
- Prefer reusable feature components over screen-specific one-offs.
