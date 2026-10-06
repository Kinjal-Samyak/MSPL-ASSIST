# Workshop Status Model

Status values are separate by entity. A status is never inferred from a display label or manually calculated duration.

## Workshop Case status

| Status | Owner | Meaning | Allowed next states |
| --- | --- | --- | --- |
| `COORDINATOR_REVIEW` | System/Coordinator | New Case awaiting review | `RESOLVED_BY_COORDINATOR`, `TECHNICIAN_ASSIGNED` |
| `TECHNICIAN_ASSIGNED` | Coordinator | Primary technician has been assigned | `CONSULTATION`, `REPAIR_REQUIRED`, `RESOLVED_AFTER_CONSULTATION` |
| `CONSULTATION` | Technician/Coordinator | Specialist input is pending or active | `TECHNICIAN_ASSIGNED`, `REPAIR_REQUIRED`, `RESOLVED_AFTER_CONSULTATION` |
| `REPAIR_REQUIRED` | Technician | Repair work confirmed; Job Card creation required | `JOB_CARD_ACTIVE` |
| `JOB_CARD_ACTIVE` | System | Linked Job Card is executing | `READY_FOR_DELIVERY` |
| `READY_FOR_DELIVERY` | Technician/System | Workshop work complete; RFD Idle Time begins | `DELIVERED` |
| `DELIVERED` | System/Coordinator | Vehicle hand-off/assignment recorded | `CLOSED` |
| `RESOLVED_BY_COORDINATOR` | Coordinator | No technician repair required | `CLOSED` |
| `RESOLVED_AFTER_CONSULTATION` | Technician/Coordinator | Remotely resolved; no Job Card | `CLOSED` |
| `CLOSED` | System | Terminal historical Case | none |

`CLOSED` is not a new persistence enum for existing Customer/Deployment status. Mapping to existing Ticket and fleet representations is an approved backend-phase concern.

## Job Card status

| Status | Entry criteria | Exit criteria | Owner |
| --- | --- | --- | --- |
| `DRAFT` | Case decision is Repair Required | Technician assigned | System |
| `ASSIGNED` | Primary technician recorded | Inspection started | Coordinator/System |
| `INSPECTION` | Assigned technician begins assessment | Inspection complete | Technician |
| `DIAGNOSIS` | Inspection complete | Diagnosis recorded | Technician |
| `REPAIR` | Recommended repair accepted under policy | Repair tasks complete | Technician |
| `QUALITY_CHECK` | Repair complete | Required QC passes or fails | Technician/authorised QC actor |
| `READY` | QC passes | Delivery/assignment recorded | Technician |
| `DELIVERED` | Delivery Record exists | Ticket closure integration completes | System/Coordinator |
| `CLOSED` | Case closes | none | System |

Forbidden transitions include skipping required predecessor stages, moving from Closed, moving from Ready back to Repair without a failed QC/rework event, and creating a Job Card for a remote resolution.

## Stage status ownership

| Entity | Status values | Owner |
| --- | --- | --- |
| Inspection | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` | Assigned technician |
| Diagnosis | `NOT_STARTED`, `IN_PROGRESS`, `RECORDED` | Assigned technician/consultant |
| Repair | `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED_BY_SPARE`, `COMPLETED` | Assigned technician |
| Quality Check | `PENDING`, `PASSED`, `FAILED` | Technician or authorised QC actor |
| Delivery | `NOT_READY`, `READY`, `DELIVERED`, `EXCEPTION` | System/Coordinator integration |

The approved Workshop-facing presentation maps repair activity to `Inspection`, `Waiting For Spare`, `Work In Progress`, and `Ready For Deployment`. Diagnosis, Repair, and Quality Check remain internal Job Card detail stages.
