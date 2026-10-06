# Customer Management Module Specification

> Update (Milestone: Customer Module – Build, 80% target): Core customer CRUD/search/details/timeline/rental-history/active-vehicles/documents-metadata flows are now implemented with existing architecture patterns. Physical document storage and hard authorization enforcement remain for stabilization.

## 1. Module Purpose
### Business objective
Maintain authoritative customer records, contracts, contacts, and service history to support accurate operations and SLA enforcement.

### Primary users
- Service Coordinator
- Operations Manager
- Platform Admin
- Fleet Supervisor (self-view)

### Business value
- Reduces ticket data errors.
- Enables customer-level analytics and contract compliance.
- Improves account-level communication and support.

---

## 2. Features
### Must Have
- Customer list and profile view.
- Contact management.
- Contract and SLA profile display.
- Linked fleet/deployments visibility.
- Customer ticket history.

### Should Have
- Customer health score.
- Account segmentation (strategic/standard/etc.).
- Contact role hierarchy and escalation matrix.

### Future
- CRM sync connectors.
- AI account risk alerts.
- Renewal prediction signals.

---

## 3. Screen List
- Customer List
- Customer Detail (tabs: Profile, Fleet, Contracts, Ticket History)
- Customer Create/Edit
- Contact Drawer
- Contract Detail Modal
- Customer Merge Dialog
- Deactivation Confirmation Modal

---

## 4. User Flow
### Happy path
1. Coordinator searches customer.
2. Opens profile and verifies active contract.
3. Uses customer context while creating ticket.
4. Updates contact details if needed.

### Alternative paths
- New customer onboarding by admin.
- Merge duplicate customer records.

### Exception paths
- Customer inactive/expired contract blocks new ticket creation.
- Missing mandatory billing/contact fields triggers profile validation warnings.

---

## 5. UI Components
- Customer summary cards
- Contacts table
- Contract timeline
- Fleet association table
- Search and faceted filters
- Merge warning dialogs
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| customerId | string | Yes | Yes | No | unique |
| customerCode | string | Yes | Yes | No | generated |
| legalName | string | Yes | No | Yes | 3..200 chars |
| displayName | string | Yes | No | Yes | 3..120 chars |
| status | enum | Yes | No | Yes | ACTIVE/INACTIVE/SUSPENDED |
| taxId | string | Yes | No | Yes | format by country |
| billingAddress | object | Yes | No | Yes | mandatory fields |
| primaryContact.name | string | Yes | No | Yes | non-empty |
| primaryContact.email | string | Yes | No | Yes | valid email |
| primaryContact.phone | string | Yes | No | Yes | E.164 or local policy |
| contract.startDate | date | Yes | No | Yes | <= endDate |
| contract.endDate | date | Yes | No | Yes | >= startDate |
| contract.slaTier | enum | Yes | No | Yes | allowed tiers |
| accountOwnerUserId | string | No | No | Yes | existing user |

---

## 7. API Requirements

### Required endpoints
- `GET /customers`
- `POST /customers`
- `GET /customers/{id}`
- `PATCH /customers/{id}`
- `GET /customers/{id}/contacts`
- `POST /customers/{id}/contacts`
- `GET /customers/{id}/contracts`
- `POST /customers/{id}/merge`
- `POST /customers/{id}/deactivate`
- `GET /customers/{id}/tickets`

### Error responses
- `400` invalid contact or contract data
- `404` customer not found
- `409` duplicate tax ID / merge conflict
- `422` deactivation blocked due to open obligations

### Pagination/filtering/sorting
- List pagination enabled.
- Filter by status, segment, account owner, contract tier.
- Sort by name, updated date, active fleet count.

---

## 8. Business Rules
- Customer tax ID must be unique per tenant.
- At least one active contact required for ACTIVE customers.
- Contract expiry controls ticket creation eligibility.
- Deactivation not allowed when open critical tickets exist.
- Merge requires source and target in same tenant/legal entity constraints.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ | ✓ | ✓ |  |  |  |
| Read | ✓ | ✓ | ✓ | Limited | Own account | ✓ |
| Update | ✓ | ✓ | ✓ |  | Limited profile fields |  |
| Delete | ✓ (policy) |  |  |  |  |  |
| Export | ✓ | ✓ | ✓ |  |  | ✓ |
| Approve | ✓ | ✓ |  |  |  |  |
| Reject | ✓ | ✓ |  |  |  |  |

---

## 10. Acceptance Criteria
- Customer CRUD flows validate required business/legal fields.
- Contract status impacts ticket eligibility correctly.
- Contact updates are auditable and immediately reflected.
- Duplicate detection and merge produce consistent record lineage.
- Customer ticket history is complete and filterable.

---

## 11. Future Enhancements
- AI-assisted duplicate profile detection.
- Account churn risk prediction.
- Automated contract expiry renewal workflow.
