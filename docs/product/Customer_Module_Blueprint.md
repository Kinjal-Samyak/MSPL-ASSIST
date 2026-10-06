# Customer Module Blueprint (CM-0)

## Document Control
- Product: MSPL Assist
- Sprint: CM-0 – Customer Module Planning & Freeze
- Version: 1.0 (Freeze Candidate)
- Scope: Documentation and architecture only (no code/database/API implementation changes)
- Audience: Product, Architecture, Backend, Frontend, QA

---

## 1. Module Overview
Customer Module is the operational source of truth for customer identity, contact data, lifecycle state, documents metadata, rental history, active vehicle associations, and timeline events used by ticketing and service operations.

## 2. Business Objectives
- Ensure reliable customer master data for ticket creation and service workflows.
- Enable fast customer search for coordinators.
- Reduce duplicate/incomplete customer records.
- Provide complete customer context (history, vehicles, timeline) for decision-making.
- Support safe customer deactivation with auditability.

## 3. User Roles
- **Admin**: Full create/read/update/deactivate control.
- **Coordinator**: Create/read/update, limited deactivation based on policy.
- **Technician**: Read-only access to assigned-customer context.

## 4. Navigation
- Primary menu: **Customers**
- Sub-views:
  - Customer List
  - Customer Details
  - Create Customer
  - Edit Customer
  - Deactivate Confirmation

## 5. Screen List
1. Customer List Screen
2. Customer Details Screen
3. Create Customer Form
4. Edit Customer Form
5. Deactivate Customer Confirmation Modal
6. Customer Documents Panel
7. Customer Rental History Panel
8. Customer Active Vehicles Panel
9. Customer Timeline Panel

## 6. Screen Wireflow
1. User opens **Customer List**.
2. User searches/filters and selects customer row.
3. User lands on **Customer Details** (tabs: Overview, Documents, Rental History, Active Vehicles, Timeline).
4. User can:
   - Create new customer from list action.
   - Edit customer from details action.
   - Deactivate customer from details action (guarded confirmation).
5. On create/edit/deactivate success, return to details/list with success feedback and refreshed data.

## 7. Customer Lifecycle
Draft (during form entry) -> Active (usable in operations) -> Suspended (temporary restricted usage) -> Inactive (deactivated, read-only historical record).

## 8. Customer Statuses
- **ACTIVE**: Customer available for tickets and lookup.
- **SUSPENDED**: Customer visible but restricted for new operations per business rule.
- **INACTIVE**: Customer disabled from new operations; retained for history/audit.

## 9. Customer Fields
### Core
- customerId (UUID, system-generated, read-only)
- name (required)
- registeredMobile (required, unique in active records)
- alternateMobile (optional)
- whatsAppNumber (optional)
- email (optional)
- address (optional)
- status (enum: ACTIVE/SUSPENDED/INACTIVE)
- createdAt, updatedAt (system-managed)

### Computed/Derived (read-only in UI)
- activeVehicleCount
- activeRentalCount
- totalTickets
- lastActivityAt

## 10. Customer CRUD Operations
- **Create Customer**: Insert customer master with validation and duplicate checks.
- **Read Customer List**: Paginated list with search/filter/sort.
- **Read Customer Details**: Full profile + documents + rental history + active vehicles + timeline.
- **Update Customer**: Editable profile fields with audit trail.
- **Deactivate Customer**: Status transition to INACTIVE with reason and policy checks.
- **No hard delete** in v1.

## 11. Search & Filters
### Search keys
- Registered mobile
- Customer ID
- Customer name

### Filters
- Status
- Hub (derived from active deployments)
- Has active vehicles (Yes/No)
- Date range (createdAt)

### Sorting
- Name
- Created date
- Updated date
- Active vehicle count

## 12. Validation Rules
- name: required, trimmed, 3-120 chars.
- registeredMobile: required, numeric pattern, country policy compliant.
- alternateMobile/whatsAppNumber: optional, must pass mobile format if provided.
- email: optional, valid email format if provided.
- status: must be valid enum value.
- No leading/trailing whitespace persistence for string inputs.
- Prevent duplicate submit while request is in-flight.

## 13. Business Rules
- Customer with ACTIVE status is eligible for operational linking (tickets/deployments).
- Deactivation is blocked if policy conditions fail (e.g., active rentals/open critical obligations).
- INACTIVE customers remain searchable in historical context but excluded from default active lookups.
- Customer timeline must capture create/update/status-change events.
- Documents in v1 are metadata-driven references (no physical storage change in CM-0).

## 14. API Requirements
> API requirements definition only; no contract changes in CM-0.

- `GET /api/v1/customers` (list with pagination/search/filter/sort)
- `POST /api/v1/customers` (create)
- `GET /api/v1/customers/{customerId}` (details)
- `PATCH /api/v1/customers/{customerId}` (edit)
- `PATCH /api/v1/customers/{customerId}/deactivate` (status transition)
- `GET /api/v1/customers/{customerId}/documents` (metadata list)
- `GET /api/v1/customers/{customerId}/rental-history`
- `GET /api/v1/customers/{customerId}/active-vehicles`
- `GET /api/v1/customers/{customerId}/timeline`

Standard responses: 200/201/400/404/409/422/500 using existing response wrapper.

## 15. Backend Services Required
- CustomerQueryService (list/detail/search/filter/sort orchestration)
- CustomerCommandService (create/update/deactivate)
- CustomerValidationService (input + business policy validation)
- CustomerTimelineService (event composition)
- CustomerDocumentService (metadata retrieval)
- CustomerRentalHistoryService (deployment/ticket-derived history)
- CustomerMapper (entity -> DTO)
- CustomerRepository extensions following existing repository pattern

## 16. Frontend Components Required
- CustomerListPage
- CustomerTable
- CustomerFilters
- CustomerSearchBar
- CustomerDetailsPage
- CustomerOverviewCard
- CustomerDocumentsPanel
- CustomerRentalHistoryPanel
- CustomerActiveVehiclesPanel
- CustomerTimelinePanel
- CreateEditCustomerModal/Form
- DeactivateCustomerModal
- Reuse existing loading/empty/error state components

## 17. Database Tables Used (Reuse Existing Schema)
Primary reuse targets from current schema:
- `Customer`
- `Deployment`
- `Hub`
- `VehicleModel`
- `Ticket`
- `TicketActivity` (timeline events where customer-linked through ticket/deployment)

Notes:
- Customer documents in v1 should use metadata references via existing attachment/document strategy; avoid schema changes in CM-0 planning.
- Any gap requiring a new table is deferred to post-freeze decision with ADR.

## 18. Permissions Matrix
| Action | Admin | Coordinator | Technician |
|---|---:|---:|---:|
| View customer list/details | ✓ | ✓ | Limited (assigned context) |
| Create customer | ✓ | ✓ |  |
| Edit customer | ✓ | ✓ (non-governance fields) |  |
| Deactivate customer | ✓ | Conditional (policy-gated) |  |
| View documents/rental history/active vehicles/timeline | ✓ | ✓ | Limited |
| Export customer data | ✓ | ✓ |  |

## 19. Error Scenarios
- Invalid request payload -> 400
- Customer not found -> 404
- Duplicate mobile/identity conflict -> 409
- Deactivation blocked by policy -> 422
- Unauthorized/forbidden access -> 401/403
- Downstream service failure -> 500 with friendly UI message
- Empty result set for search/filter -> valid 200 with empty state

## 20. Future Enhancements (v1.1)
- Physical customer document upload/download lifecycle.
- Duplicate customer detection/merge workflow.
- Bulk import and bulk update.
- Customer risk/health scoring.
- SLA/contract panel and renewal alerts.
- Advanced audit trail with diff view.

---

## Freeze Notes
- This blueprint is implementation-ready at architecture level.
- CM-0 introduces no runtime changes and preserves current frozen architecture constraints.
