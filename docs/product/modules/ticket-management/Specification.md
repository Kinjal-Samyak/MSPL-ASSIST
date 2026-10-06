# Ticket Management Module Specification

## 1. Module Purpose
### Business objective
Manage end-to-end service request lifecycle from creation to closure with SLA control, assignment, and auditability.

### Primary users
- Service Coordinator
- Operations Manager
- Field Technician
- Fleet Supervisor (limited create/track)

### Business value
- Standardized incident handling.
- Lower ticket resolution time.
- Improved SLA adherence and traceability.

---

## 2. Features
### Must Have
- Ticket list with advanced filters and bulk actions.
- Ticket create flow with multiple issue items.
- Ticket detail with timeline, SLA, notes, attachments.
- Assignment and reassignment workflow.
- Status transitions and closure validation.
- Escalation and SLA breach handling.

### Should Have
- Assignment board by hub/technician capacity.
- Duplicate ticket detection.
- Customer confirmation capture at closure.

### Future
- AI-assisted triage and priority suggestion.
- Auto-routing to best technician.
- Root cause clustering by issue pattern.

---

## 3. Screen List
- Ticket List
- Ticket Create (wizard)
- Ticket Detail
- Ticket Assignment Board
- SLA Monitor
- Modals/Drawers:
  - Assign Technician Modal
  - Update Status Drawer
  - Add Note Modal
  - Add Issue Item Modal
  - Attachments Drawer
  - Escalation Dialog
  - Closure Confirmation Modal

---

## 4. User Flow
### Happy path
1. Coordinator opens Ticket Create.
2. Selects customer, deployment, vehicle, issue items.
3. Sets priority and submits.
4. Assigns technician and SLA.
5. Technician updates progress.
6. Coordinator verifies and closes ticket.

### Alternative paths
- Ticket reopened after customer dispute.
- Ticket merged with existing duplicate.
- Multi-issue ticket resolved in staged sub-statuses.

### Exception paths
- Customer/deployment mismatch blocks ticket creation.
- No eligible technician for assignment triggers escalation queue.
- SLA timer failure switches to manual escalation mode.

---

## 5. UI Components
- Kanban-style assignment board
- Ticket list table (sort/filter/group)
- Stepper-based create form
- Timeline with status markers
- SLA countdown badges
- Priority/Status badges
- Notes editor and attachment uploader
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| ticketId | string | Yes | Yes | No | unique |
| ticketNumber | string | Yes | Yes | No | generated format |
| customerId | string | Yes | No | Yes (pre-close) | must exist |
| deploymentId | string | Yes | No | Yes (pre-assignment) | active deployment |
| vehicleId | string | Yes | No | Yes (pre-assignment) | mapped to deployment |
| priority | enum | Yes | No | Yes | P1..P4 |
| status | enum | Yes | No | Yes | valid transition only |
| issueItems[] | object[] | Yes | No | Yes | min 1 item |
| issueItems[].categoryId | string | Yes | No | Yes | category exists |
| issueItems[].description | string | Yes | No | Yes | 10..1000 chars |
| assignedTo | string | No | No | Yes | active technician |
| slaDueAt | datetime | Yes | Yes | No | computed by policy |
| notes[] | object[] | No | Partly | Yes | note <= 2000 chars |
| attachments[] | object[] | No | No | Yes | type/size policy |
| closedAt | datetime | No | Yes | No | set on closure |

---

## 7. API Requirements

### Required endpoints
- `GET /tickets`
- `POST /tickets`
- `GET /tickets/{id}`
- `PATCH /tickets/{id}`
- `POST /tickets/{id}/assign`
- `POST /tickets/{id}/status`
- `POST /tickets/{id}/notes`
- `POST /tickets/{id}/attachments`
- `POST /tickets/{id}/escalate`
- `POST /tickets/{id}/close`
- `POST /tickets/{id}/reopen`

### Request/response
- List supports pagination, filters, sort, and grouping.
- Detail returns ticket, issue items, SLA, timeline, audit metadata.

### Error responses
- `400` invalid payload/state transition
- `404` ticket not found
- `409` concurrency conflict (stale version)
- `422` business rule violation (e.g., closure missing mandatory fields)

### Pagination/filtering/sorting
- Pagination: `page`, `perPage`
- Filtering: status, priority, hub, assignee, SLA state, date range
- Sorting: `createdAt`, `updatedAt`, `slaDueAt`, `priority`

---

## 8. Business Rules
- Ticket requires active customer and deployment.
- At least one issue item is mandatory.
- Status transitions follow state machine (no direct invalid jumps).
- Closure requires resolution note and mandatory verification fields.
- Reopen allowed only within configured post-closure window.
- P1/P2 tickets mandate escalation policy and tighter SLA.

Edge cases:
- Simultaneous update by coordinator and technician.
- Reassignment during in-progress service.
- Ticket created for inactive vehicle.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ | ✓ | ✓ |  | ✓ |  |
| Read | ✓ | ✓ | ✓ | Assigned-only | Own-org |  |
| Update | ✓ | ✓ | ✓ | Status/notes only | Limited |  |
| Delete | ✓ (restricted) |  |  |  |  |  |
| Export | ✓ | ✓ | ✓ |  | Limited |  |
| Approve | ✓ | ✓ | ✓ (closure checklist) |  |  |  |
| Reject | ✓ | ✓ | ✓ |  |  |  |

---

## 10. Acceptance Criteria
- Ticket can be created only with valid customer/deployment/vehicle.
- Status transition guardrails block invalid transitions.
- SLA breach indication updates in near-real time.
- Assignment and reassignment are fully audited.
- Multi-issue tickets persist and render all issue items accurately.
- Closure and reopen flows satisfy validation and audit requirements.

---

## 11. Future Enhancements
- AI classification of issue descriptions.
- Recommended SLA based on historical resolution time.
- Automated duplicate detection and merge assistant.
- Workflow automation rules (auto-assign, auto-escalate).
