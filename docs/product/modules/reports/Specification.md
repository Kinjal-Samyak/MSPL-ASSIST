# Reports Module Specification

## 1. Module Purpose
### Business objective
Provide operational, financial, and SLA reporting with export and scheduling capabilities for stakeholders across management layers.

### Primary users
- Operations Manager
- Service Coordinator
- Read-Only Executive
- Platform Admin

### Business value
- Enables evidence-based operational decisions.
- Supports compliance/audit reporting.
- Reduces manual data consolidation effort.

---

## 2. Features
### Must Have
- Reports catalog (prebuilt templates).
- Report run with filters (date, hub, customer, status).
- Download/export (CSV/XLSX/PDF as applicable).
- Report run history and status.

### Should Have
- Scheduled reports with recipients.
- Saved custom report configurations.
- Comparative period analysis.

### Future
- Natural language report query.
- AI-generated insight annotations.
- Auto-distribution by role and SLA events.

---

## 3. Screen List
- Reports Home
- Report Detail / Runner
- Saved Reports
- Schedule Report Modal
- Export Settings Dialog
- Report History Drawer
- Share Report Modal

---

## 4. User Flow
### Happy path
1. User opens Reports Home.
2. Selects report template.
3. Applies filters and runs report.
4. Reviews preview and exports.
5. Optionally saves schedule.

### Alternative paths
- Run report from dashboard drill-through context.
- Duplicate and edit a saved report config.

### Exception paths
- Heavy query exceeds threshold and moves to async generation.
- Export failure prompts retry with audit entry.
- Unauthorized data scope removed from result set.

---

## 5. UI Components
- Report template cards
- Filter panel
- Data table with grouping
- Summary metric chips
- Run progress indicator
- Download and share buttons
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| reportId | string | Yes | Yes | No | template exists |
| reportName | string | Yes | Yes | No | non-empty |
| startDate | date | Yes | No | Yes | <= endDate |
| endDate | date | Yes | No | Yes | >= startDate |
| hubIds | string[] | No | No | Yes | valid hubs |
| customerIds | string[] | No | No | Yes | valid customers |
| statusFilter[] | enum[] | No | No | Yes | valid statuses |
| outputFormat | enum | Yes | No | Yes | CSV/XLSX/PDF |
| scheduleCron | string | No | No | Yes | cron policy |
| recipients[] | string[] | No | No | Yes | valid emails/users |
| generatedAt | datetime | Yes | Yes | No | system generated |

---

## 7. API Requirements

### Required endpoints
- `GET /reports`
- `GET /reports/{id}`
- `POST /reports/{id}/run`
- `GET /reports/runs/{runId}`
- `GET /reports/runs/{runId}/download`
- `POST /reports/{id}/schedule`
- `GET /reports/schedules`
- `PATCH /reports/schedules/{id}`
- `DELETE /reports/schedules/{id}`

### Error responses
- `400` invalid filter set
- `403` report not permitted for role
- `404` report/run not found
- `413` export size exceeds limit
- `500` generation failure

### Pagination/filtering/sorting
- Report run history paginated.
- Sorting by generated time, duration, status.
- Filtering by template, owner, status.

---

## 8. Business Rules
- Exported data must be scope-filtered by role/tenant.
- Scheduled report recipients limited to allowed org domain/policy.
- Date range limits enforced (e.g., max 12 months interactive run).
- Sensitive fields masked for non-privileged roles.
- Async generation required for large datasets.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ | ✓ | ✓ (saved configs) |  |  |  |
| Read | ✓ | ✓ | ✓ |  | Limited | ✓ |
| Update | ✓ | ✓ | ✓ (own schedules) |  |  |  |
| Delete | ✓ | ✓ | ✓ (own schedules) |  |  |  |
| Export | ✓ | ✓ | ✓ |  | Limited | ✓ |
| Approve | ✓ |  |  |  |  |  |
| Reject | ✓ |  |  |  |  |  |

---

## 10. Acceptance Criteria
- Prebuilt reports execute with valid filters and consistent totals.
- Exports are downloadable and auditable.
- Scheduled reports trigger on schedule and deliver to recipients.
- Role-based data masking and scope restrictions are enforced.

---

## 11. Future Enhancements
- AI narrative summaries on report output.
- Smart recommendation of frequently used report templates.
- Automatic anomaly highlighting in generated reports.
