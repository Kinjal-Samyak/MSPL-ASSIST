# Deployment Management Module Specification

## 1. Module Purpose
### Business objective
Track where vehicles are deployed, under which customer contract context, and whether deployments are active, suspended, or completed.

### Primary users
- Service Coordinator
- Operations Manager
- Platform Admin

### Business value
- Ensures ticket eligibility against active deployment.
- Provides operational visibility by site/hub/customer.
- Supports accurate utilization and compliance reporting.

---

## 2. Features
### Must Have
- Deployment list with status filtering.
- Deployment create/edit with customer-vehicle linkage.
- Deployment detail with timeline and current state.
- Activation/suspension/closure actions.
- Deployment verification checks for ticket creation.

### Should Have
- Bulk deployment onboarding.
- SLA profile inheritance from contract.
- Geo-location and route metadata.

### Future
- Geofence and utilization alerts.
- Auto-suspension policy rules.
- Deployment optimization recommendations.

---

## 3. Screen List
- Deployment List
- Deployment Create/Edit
- Deployment Detail
- Verification Result Drawer
- Activate/Suspend Dialog
- Close Deployment Modal
- Assignment Change Modal

---

## 4. User Flow
### Happy path
1. Coordinator creates deployment with customer and vehicle.
2. System validates eligibility and activates deployment.
3. Tickets are raised against active deployment.
4. Deployment is suspended/closed when contract/site conditions change.

### Alternative paths
- Deployment reassigned to another vehicle.
- Temporary suspension during maintenance period.

### Exception paths
- Vehicle already deployed elsewhere blocks activation.
- Contract expired blocks new activation.
- Deployment closure blocked by open critical tickets.

---

## 5. UI Components
- Deployment summary cards
- Status timeline
- Eligibility checklist panel
- Mapping/location panel
- Assignment table
- Search/filter/sort controls
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| deploymentId | string | Yes | Yes | No | unique |
| deploymentCode | string | Yes | Yes | No | generated |
| customerId | string | Yes | No | Yes | active customer |
| vehicleId | string | Yes | No | Yes | not in conflicting deployment |
| hubId | string | Yes | No | Yes | valid hub |
| siteName | string | Yes | No | Yes | non-empty |
| startDate | date | Yes | No | Yes | <= endDate if set |
| endDate | date | No | No | Yes | >= startDate |
| status | enum | Yes | No | Yes | ACTIVE/SUSPENDED/CLOSED |
| suspensionReason | string | Cond. | No | Yes | required if suspended |
| verificationState | enum | Yes | Yes | No | computed |

---

## 7. API Requirements

### Required endpoints
- `GET /deployments`
- `POST /deployments`
- `GET /deployments/{id}`
- `PATCH /deployments/{id}`
- `POST /deployments/{id}/verify`
- `POST /deployments/{id}/activate`
- `POST /deployments/{id}/suspend`
- `POST /deployments/{id}/close`
- `POST /deployments/{id}/reassign-vehicle`

### Error responses
- `400` invalid deployment date/rules
- `404` deployment not found
- `409` vehicle or contract conflict
- `422` close blocked by active high-priority tickets

### Pagination/filtering/sorting
- Filters: status, hub, customer, date range, verificationState.
- Sort by start date, status, customer name.
- Standard pagination support.

---

## 8. Business Rules
- Only ACTIVE deployments are ticket-eligible.
- A vehicle can have at most one ACTIVE deployment.
- Suspension requires reason and effective date.
- Closure requires no unresolved blocking obligations.
- Verification runs before ticket create and on deployment state changes.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ | ✓ | ✓ |  |  |  |
| Read | ✓ | ✓ | ✓ | Limited | Limited | ✓ |
| Update | ✓ | ✓ | ✓ |  |  |  |
| Delete | ✓ (policy) |  |  |  |  |  |
| Export | ✓ | ✓ | ✓ |  |  | ✓ |
| Approve | ✓ | ✓ | ✓ |  |  |  |
| Reject | ✓ | ✓ | ✓ |  |  |  |

---

## 10. Acceptance Criteria
- Deployment cannot activate if customer/vehicle constraints fail.
- Verification outcomes are visible and explainable.
- Activation/suspension/closure transitions are fully audited.
- Ticket module consumes deployment eligibility correctly.

---

## 11. Future Enhancements
- AI deployment risk scoring by site conditions.
- Automated suspension/reactivation via policy engine.
- Route-level optimization for deployment distribution.
