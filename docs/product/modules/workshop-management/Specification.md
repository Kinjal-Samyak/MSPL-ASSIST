# Workshop Management Module Specification

## 1. Module Purpose
### Business objective
Coordinate workshop intake, diagnostics, repair progress, part usage, and release readiness for fleet vehicles.

### Primary users
- Field Technician
- Service Coordinator
- Operations Manager

### Business value
- Reduces workshop turnaround time.
- Improves repair planning and visibility.
- Links workshop outputs directly to ticket closure quality.

---

## 2. Features
### Must Have
- Workshop job list and queue prioritization.
- Job card with diagnostic and repair tasks.
- Parts requirement and usage logging.
- Technician assignment and progress tracking.
- Release readiness checklist.

### Should Have
- Bay utilization dashboard.
- TAT analysis by issue category.
- Standard job templates by model.

### Future
- Predictive parts demand.
- AI repair recommendations.
- Smart bay scheduling optimization.

---

## 3. Screen List
- Workshop Queue
- Workshop Job Detail
- Diagnostic Checklist Screen
- Parts Usage Drawer
- Technician Assignment Modal
- Release Checklist Modal
- Job Hold/Resume Dialog

---

## 4. User Flow
### Happy path
1. Vehicle enters workshop from ticket flow.
2. Coordinator creates workshop job and assigns technician.
3. Technician runs diagnostics and records findings.
4. Repair tasks completed and validated.
5. Release checklist passed; vehicle returned to deployment flow.

### Alternative paths
- Job paused due to parts unavailability.
- Secondary technician assigned for specialized work.

### Exception paths
- Failed release checklist returns job to in-progress.
- Additional issue found creates linked follow-up ticket.
- Job cancelled due to duplicate intake.

---

## 5. UI Components
- Queue table with priority indicators
- Job progress timeline
- Checklist forms
- Parts list table
- Utilization cards
- Alerts/toasts for blockers
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| workshopJobId | string | Yes | Yes | No | unique |
| ticketId | string | Yes | Yes | No | existing ticket |
| vehicleId | string | Yes | Yes | No | existing vehicle |
| intakeTime | datetime | Yes | Yes | No | ISO-8601 |
| assignedTechnicianId | string | No | No | Yes | active user, role=technician |
| priority | enum | Yes | No | Yes | HIGH/MEDIUM/LOW |
| status | enum | Yes | No | Yes | queued/in-progress/on-hold/completed |
| diagnosticNotes | string | No | No | Yes | max 4000 chars |
| partsUsed[] | object[] | No | No | Yes | valid part + qty > 0 |
| estimatedCompletion | datetime | No | No | Yes | >= now |
| releaseChecklist[] | object[] | Yes | No | Yes | all mandatory checks pass |

---

## 7. API Requirements

### Required endpoints
- `GET /workshop/jobs`
- `POST /workshop/jobs`
- `GET /workshop/jobs/{id}`
- `PATCH /workshop/jobs/{id}`
- `POST /workshop/jobs/{id}/assign`
- `POST /workshop/jobs/{id}/status`
- `POST /workshop/jobs/{id}/parts`
- `POST /workshop/jobs/{id}/release-check`
- `POST /workshop/jobs/{id}/complete`

### Error responses
- `400` invalid checklist/parts data
- `404` job not found
- `409` status transition conflict
- `422` completion blocked due to failed checklist

### Pagination/filtering/sorting
- Queue filters by status, priority, technician, bay, age bucket.
- Sorting by priority, intake time, estimated completion.

---

## 8. Business Rules
- Job completion requires all mandatory release checks complete.
- On-hold status requires reason code.
- Technician assignment required before in-progress status.
- Parts usage logged before completion if repair task requires parts.
- Workshop completion can trigger ticket status progression.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ | ✓ | ✓ |  |  |  |
| Read | ✓ | ✓ | ✓ | Assigned/Hub scope |  | Limited |
| Update | ✓ | ✓ | ✓ | Assigned jobs |  |  |
| Delete | ✓ (policy) |  |  |  |  |  |
| Export | ✓ | ✓ | ✓ |  |  | ✓ |
| Approve | ✓ | ✓ | ✓ (release approval) |  |  |  |
| Reject | ✓ | ✓ | ✓ |  |  |  |

---

## 10. Acceptance Criteria
- Workshop queue reflects accurate priority and status.
- Job status transitions enforce required prerequisites.
- Release checklist blocks incomplete job completion.
- Parts usage and technician updates are auditable.
- Completion event correctly updates related operational context.

---

## 11. Future Enhancements
- AI-assisted root-cause and repair action suggestions.
- Automated parts procurement trigger.
- Digital twin integration for diagnostic simulation.
