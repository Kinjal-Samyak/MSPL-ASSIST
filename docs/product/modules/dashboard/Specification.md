# Dashboard Module Specification

## 1. Module Purpose
### Business objective
Provide a real-time executive and operational control tower for EV fleet service performance, enabling faster decisions on SLA risk, hub efficiency, and revenue outcomes.

### Primary users
- Operations Manager
- Service Coordinator
- Read-Only Executive
- Platform Admin (oversight)

### Business value
- Reduces mean time to detect SLA risk.
- Improves dispatch and assignment decisions.
- Gives leadership a single source of operational truth.

---

## 2. Features
### Must Have
- KPI strip (tickets, SLA, fleet utilization, workshop load, revenue).
- Trend and distribution charts (fleet trend, ticket status, issue categories, hub performance).
- Recent activity timeline.
- Quick actions panel.
- Global date range and hub filters.
- Role-based visibility of widgets.

### Should Have
- Saved dashboard views per user.
- Drill-through from KPI/charts to ticket lists.
- Benchmark vs prior period (WoW, MoM).

### Future
- Predictive SLA breach widget.
- AI-generated daily executive summary.
- Dynamic anomaly detection cards.

---

## 3. Screen List
- Dashboard Home
- Widget Configuration Drawer
- Filter Drawer (date, hub, customer segment)
- KPI Detail Modal (metric definition + source)
- Activity Detail Modal
- Export Snapshot Dialog (PDF/CSV)

---

## 4. User Flow
### Happy path
1. User opens Dashboard Home.
2. System loads user scope and default filters.
3. KPIs and charts render.
4. User drills into a KPI/chart.
5. User navigates to filtered downstream module (tickets/reports).

### Alternative paths
- User changes date range and hub; widgets refresh.
- User switches saved view for morning/evening operations.

### Exception paths
- Partial data source failure: unaffected widgets render; failed widget shows error state.
- No data for filters: empty-state with reset option.
- Unauthorized widget access: widget hidden and logged.

---

## 5. UI Components
- KPI cards
- Chart cards (line, pie, bar, horizontal bar)
- Activity timeline
- Quick action cards
- Filter chips and date picker
- Segment toggles
- Export button group
- Empty state, loading skeleton, error card

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| dateRange.start | datetime | Yes | No | Yes | start <= end |
| dateRange.end | datetime | Yes | No | Yes | end >= start |
| hubIds | string[] | No | No | Yes | each hub must exist |
| kpi.activeTickets | number | Yes | Yes | No | >= 0 |
| kpi.criticalTickets | number | Yes | Yes | No | >= 0 |
| kpi.fleetUtilizationPct | number | Yes | Yes | No | 0..100 |
| kpi.slaBreached | number | Yes | Yes | No | >= 0 |
| kpi.revenueToday | decimal | Yes | Yes | No | >= 0 |
| fleetTrend[].period | string | Yes | Yes | No | non-empty |
| fleetTrend[].activeFleet | number | Yes | Yes | No | >= 0 |
| ticketStatus[].status | enum | Yes | Yes | No | allowed statuses |
| ticketStatus[].count | number | Yes | Yes | No | >= 0 |
| activity[].timestamp | datetime | Yes | Yes | No | ISO-8601 |
| activity[].message | string | Yes | Yes | No | max 500 chars |

---

## 7. API Requirements

### Required endpoints
- `GET /dashboard/kpis`
- `GET /dashboard/fleet-trend`
- `GET /dashboard/ticket-status`
- `GET /dashboard/issue-categories`
- `GET /dashboard/hub-performance`
- `GET /dashboard/activity-feed`
- `POST /dashboard/export`

### Request conventions
- Query: `startDate`, `endDate`, `hubIds[]`, `customerId`, `timezone`
- Headers: tenant and auth context

### Response conventions
- Typed payload per widget with `generatedAt` timestamp.
- Include `sourceWindow` and `comparisonWindow` metadata.

### Error responses
- `400` invalid filter range
- `401/403` unauthorized scope
- `429` query rate limit
- `500` analytics aggregation failure

### Pagination / filtering / sorting
- Activity feed supports pagination (`page`, `perPage`) and sorting (`timestamp desc` default).
- Chart endpoints support filters but not pagination.

---

## 8. Business Rules
- Dashboard data must respect role and tenant scope.
- Critical ticket count uses severity in `{P1,P2}` and non-closed statuses.
- SLA breach KPI counts only active breaches, not historical closed breaches.
- Revenue KPIs use billing-approved transactions only.
- Timezone-specific day boundaries must be applied consistently.

Edge cases:
- Cross-midnight shifts.
- Hub with no active vehicles.
- Late-arriving ticket events (reconciliation job updates metrics).

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create |  |  |  |  |  |  |
| Read | ✓ | ✓ | ✓ | Limited | Limited | ✓ |
| Update (view config) | ✓ | ✓ | ✓ |  |  |  |
| Delete |  |  |  |  |  |  |
| Export | ✓ | ✓ | ✓ |  | Limited | ✓ |
| Approve |  |  |  |  |  |  |
| Reject |  |  |  |  |  |  |

---

## 10. Acceptance Criteria
- All dashboard widgets load within target SLA for standard filter range.
- Filter changes update all relevant widgets consistently.
- Widget drill-through applies equivalent filter context.
- Empty/loading/error states are present for every widget.
- Role-restricted widgets are not visible to unauthorized users.
- Export output matches on-screen filter scope and totals.

---

## 11. Future Enhancements
- AI operations summary (daily, weekly).
- Forecasted ticket load by hub and category.
- Automated dashboard narrative for leadership mails.
- Intelligent recommended actions (rebalance technicians, prioritize hubs).
