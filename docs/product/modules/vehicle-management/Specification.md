# Vehicle Management Module Specification

## 1. Module Purpose
### Business objective
Maintain complete lifecycle records for each EV asset, including specifications, warranty, service history, and operational status.

### Primary users
- Service Coordinator
- Operations Manager
- Field Technician
- Platform Admin

### Business value
- Better diagnosis with complete history.
- Lower repeat failures.
- Improved compliance and asset utilization visibility.

---

## 2. Features
### Must Have
- Vehicle registry with search/filter.
- Vehicle profile and technical attributes.
- Warranty details and expiry status.
- Service history timeline.
- Current deployment and workshop state.

### Should Have
- Vehicle health score.
- Odometer/battery lifecycle tracking.
- Preventive maintenance schedule view.

### Future
- IoT telemetry integration.
- Predictive failure alerts.
- Battery degradation analytics.

---

## 3. Screen List
- Vehicle List
- Vehicle Detail (tabs: Profile, Warranty, Service History, Deployments)
- Vehicle Create/Edit
- Warranty Update Modal
- Service Event Drawer
- Transfer Vehicle Dialog
- Vehicle Decommission Modal

---

## 4. User Flow
### Happy path
1. Coordinator opens vehicle profile.
2. Reviews recent service history and warranty.
3. Links vehicle to deployment if eligible.
4. Technician updates service event after work completion.

### Alternative paths
- Bulk import vehicles by admin.
- Vehicle transfer between hubs/deployments.

### Exception paths
- Deployed vehicle cannot be decommissioned.
- Invalid registration/VIN blocks save.
- Warranty claim rejected due to policy mismatch.

---

## 5. UI Components
- Vehicle profile cards
- Technical specs table
- Service timeline
- Warranty badge and expiry indicators
- Vehicle status chips
- Search/filter toolbar
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| vehicleId | string | Yes | Yes | No | unique |
| registrationNumber | string | Yes | No | Yes | unique + format |
| vin | string | Yes | No | Yes | unique, 17-char policy |
| modelId | string | Yes | No | Yes | valid master model |
| make | string | Yes | No | Yes | non-empty |
| yearOfManufacture | number | Yes | No | Yes | reasonable range |
| batteryCapacityKwh | number | No | No | Yes | > 0 |
| odometerKm | number | No | No | Yes | >= previous reading |
| status | enum | Yes | No | Yes | ACTIVE/WORKSHOP/INACTIVE |
| warrantyStartDate | date | Yes | No | Yes | <= end date |
| warrantyEndDate | date | Yes | No | Yes | >= start date |
| currentDeploymentId | string | No | Yes | No | resolved by deployment module |

---

## 7. API Requirements

### Required endpoints
- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/{id}`
- `PATCH /vehicles/{id}`
- `GET /vehicles/{id}/service-history`
- `POST /vehicles/{id}/service-events`
- `GET /vehicles/{id}/warranty`
- `PATCH /vehicles/{id}/warranty`
- `POST /vehicles/{id}/transfer`
- `POST /vehicles/{id}/decommission`

### Error responses
- `400` invalid VIN/registration data
- `404` vehicle not found
- `409` duplicate identifiers or concurrent update
- `422` operation conflicts with active deployment

### Pagination/filtering/sorting
- Filter by model, status, hub, warranty expiry window.
- Sort by registration, updated date, service recency.
- Service history supports pagination and descending event time.

---

## 8. Business Rules
- VIN and registration unique per tenant.
- Odometer cannot decrease across service events.
- Decommission blocked while vehicle has active deployment.
- Workshop status requires linked active workshop job.
- Warranty claims only valid within warranty period and covered categories.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ | ✓ | ✓ |  |  |  |
| Read | ✓ | ✓ | ✓ | ✓ | Limited | ✓ |
| Update | ✓ | ✓ | ✓ | Service events only |  |  |
| Delete | ✓ (policy) |  |  |  |  |  |
| Export | ✓ | ✓ | ✓ |  |  | ✓ |
| Approve | ✓ | ✓ |  |  |  |  |
| Reject | ✓ | ✓ |  |  |  |  |

---

## 10. Acceptance Criteria
- Vehicle identifiers enforce uniqueness constraints.
- Service history is chronologically correct and auditable.
- Warranty expiry/state visible and accurate on detail views.
- Status transitions respect deployment/workshop dependencies.
- Transfer and decommission operations are rule-compliant.

---

## 11. Future Enhancements
- AI maintenance recommendation based on historical failures.
- Fleet-level battery health scoring.
- Automated anomaly detection from telematics signals.
