# TM6 API Integration Report

## 1) API Inventory

Base backend mount points discovered from `backend/src/app.ts`:
- `/health`
- `/api/v1/masters`
- `/api/v1/tickets`

No other API route mounts were found in backend runtime wiring.

### 1.1 Tickets

#### Endpoint: Create Ticket
- **HTTP Method:** `POST`
- **URL:** `/api/v1/tickets/`
- **Request DTO:** `CreateTicketDto` (`backend/src/dto/ticket.dto.ts`)
  - `registeredMobile` (required)
  - `issueCategoryId` (required)
  - `issueDescription` (required)
  - `source?`, `priority?`
  - `estimatedCharges?`, `finalCharges?`
  - `coordinatorNotes?`, `sendUpdate?`
  - `mvTrackNumber?`, `vehicleNumber?`, `eta?`
- **Validated Shape:** `ValidatedCreateTicketDto` (`backend/src/validators/ticket.validator.ts`)
- **Response DTO:** `ApiResponse<TicketCreationResponseDto>`
  - `success: true`
  - `data: { existingTicket, ticketNumber, ticketId?, createdAt?, currentStatus? }`
- **Authentication required:** **No** (no auth middleware on route)
- **Pagination support:** **No**
- **Sorting support:** **No**
- **Filtering support:** **No**

### 1.2 Customers

- **Discovered customer-related API endpoints:** **None**
- Customer logic exists in services/repositories/domain, but no customer API routes are exposed.

### 1.3 Vehicles

- **Discovered vehicle-specific API endpoints:** **None**
- Vehicle model master data endpoint exists (see Master Data section).

### 1.4 Timeline / History

- **Discovered timeline/history API endpoints:** **None**
- Timeline/history persistence models exist in Prisma (`TicketHistory`, `TicketActivity`) but no route exposure.

### 1.5 Comments

- **Discovered comment API endpoints:** **None**
- `TicketComment` model exists in Prisma but no route exposure.

### 1.6 Attachments

- **Discovered attachment API endpoints:** **None**
- `TicketAttachment` model exists in Prisma but no route exposure.

### 1.7 Master Data

#### Endpoint: Get Statuses
- **HTTP Method:** `GET`
- **URL:** `/api/v1/masters/statuses`
- **Request DTO:** None
- **Response DTO:** `ApiResponse<StatusDto[]>`
- **Authentication required:** **No**
- **Pagination support:** **No**
- **Sorting support:** **No** (returned via service/repository default order)
- **Filtering support:** **No**

#### Endpoint: Get Issue Categories
- **HTTP Method:** `GET`
- **URL:** `/api/v1/masters/issue-categories`
- **Request DTO:** None
- **Response DTO:** `ApiResponse<IssueCategoryDto[]>`
- **Authentication required:** **No**
- **Pagination support:** **No**
- **Sorting support:** **No**
- **Filtering support:** **No**

#### Endpoint: Get Hubs
- **HTTP Method:** `GET`
- **URL:** `/api/v1/masters/hubs`
- **Request DTO:** None
- **Response DTO:** `ApiResponse<HubDto[]>`
- **Authentication required:** **No**
- **Pagination support:** **No**
- **Sorting support:** **No**
- **Filtering support:** **No**

#### Endpoint: Get Vehicle Models
- **HTTP Method:** `GET`
- **URL:** `/api/v1/masters/vehicle-models`
- **Request DTO:** None
- **Response DTO:** `ApiResponse<VehicleModelDto[]>`
- **Authentication required:** **No**
- **Pagination support:** **No**
- **Sorting support:** **No**
- **Filtering support:** **No**

### 1.8 Authentication

- **Discovered auth endpoints:** **None**
- **Discovered auth middleware on mounted API routes:** **None**

### 1.9 Health

#### Endpoint: Health Check
- **HTTP Method:** `GET`
- **URL:** `/health/`
- **Request DTO:** None
- **Response:** `{ status, application, version }`
- **Authentication required:** **No**
- **Pagination support:** **No**
- **Sorting support:** **No**
- **Filtering support:** **No**

---

## 2) Frontend Mapping (TM-1 to TM-5)

### TM-1 Ticket Workspace (browse/filter/sort/pagination/list + preview trigger)
- **Existing API available:** None for ticket list/query.
- **Missing API:** Ticket list endpoint with server-side pagination/sort/filter.
- **Partial API:** None.
- **Mock data currently used:** `frontend/src/features/tickets/types/ticket.mock.ts` + client-side filtering/sorting/pagination in `TicketWorkspacePage.tsx`.

### TM-2 Ticket Details (summary/customer/vehicle/technician/timeline/comments/attachments/financial/activity)
- **Existing API available:** None for ticket details read.
- **Missing API:** Ticket details by id, timeline/history feed, comments feed, attachments feed, financial details.
- **Partial API:** None.
- **Mock data currently used:** Embedded ticket detail shape from `ticket.mock.ts`.

### TM-3 Create Ticket Wizard
- **Existing API available:** `POST /api/v1/tickets/` (ticket creation).
- **Missing API:** Customer lookup by mobile/customer ID; deployed vehicle lookup by customer; issue subcategory source; attachment upload.
- **Partial API:** Ticket create exists, but request shape differs from current frontend wizard model (frontend currently creates in-memory ticket object).
- **Mock data currently used:** Wizard customer/vehicle lookup derived from in-memory ticket dataset and local state.

### TM-4 Ticket Operations (assign technician, update status, update ETA, update charges)
- **Existing API available:** None for ticket operations update.
- **Missing API:** Assign technician endpoint, status transition endpoint, ETA update endpoint, charges update endpoint.
- **Partial API:** None.
- **Mock data currently used:** Preview-local in-memory state mutations in `TicketPreview.tsx`.

### TM-5 Ticket Communication (comment add, attachment upload/delete, communication timeline, notification history)
- **Existing API available:** None.
- **Missing API:** Comment CRUD, attachment upload/list/delete, notification history retrieval.
- **Partial API:** Notification concepts exist in DB model (`NotificationLog`) but no endpoint.
- **Mock data currently used:** Preview-local in-memory comment/attachment actions and mock notification history.

### Master Data use across TM flows
- **Existing API available:** Statuses, issue categories, hubs, vehicle models endpoints exist.
- **Missing API:** Technician master endpoint; issue subcategory endpoint.
- **Partial API:** Existing master endpoints are usable but not yet integrated in frontend TM module.
- **Mock data currently used:** Hardcoded/mocked arrays in ticket feature files.

---

## 3) Missing Endpoints (for TM integration)

### Ticket Query & Details
1. `GET /api/v1/tickets` (pagination/sort/filter)
2. `GET /api/v1/tickets/:ticketId` (full details for preview)
3. `GET /api/v1/tickets/:ticketId/timeline`
4. `GET /api/v1/tickets/:ticketId/activity-log`

### Ticket Operations
5. `PATCH /api/v1/tickets/:ticketId/assign-technician`
6. `PATCH /api/v1/tickets/:ticketId/status`
7. `PATCH /api/v1/tickets/:ticketId/eta`
8. `PATCH /api/v1/tickets/:ticketId/charges`

### Communication
9. `GET /api/v1/tickets/:ticketId/comments`
10. `POST /api/v1/tickets/:ticketId/comments`
11. `GET /api/v1/tickets/:ticketId/attachments`
12. `POST /api/v1/tickets/:ticketId/attachments`
13. `DELETE /api/v1/tickets/:ticketId/attachments/:attachmentId`
14. `GET /api/v1/tickets/:ticketId/notifications`

### Wizard Support
15. `GET /api/v1/customers/search?mobile=&customerId=`
16. `GET /api/v1/customers/:customerId/deployments` (or vehicles)
17. `GET /api/v1/masters/technicians`
18. `GET /api/v1/masters/issue-subcategories?categoryId=`

### Authentication
19. Auth endpoints and middleware strategy are currently absent; integration will need finalized auth contract.

---

## 4) Integration Risks

1. **API surface gap risk (high):** Frontend TM-1..TM-5 relies heavily on mock/local state; runtime parity is low without read/update APIs.
2. **DTO mismatch risk (high):** Existing create-ticket DTO uses backend-centric fields (`registeredMobile`, `issueCategoryId`) while frontend wizard currently models richer UI objects.
3. **Status vocabulary mismatch risk (high):** Frontend status values include workflow states not aligned to current backend `StatusMaster` usage contract.
4. **No auth contract risk (high):** No auth endpoints/middleware currently wired; production integration needs auth decision first.
5. **File handling risk (medium):** Attachment upload/download/delete paths are absent; storage and signed URL strategy unresolved.
6. **Query scalability risk (medium):** No standardized pagination/filter/sort contract for tickets list yet.
7. **Audit/history consistency risk (medium):** Activity/timeline/comments exist in DB models but no public API consistency guarantees.

---

## 5) Recommended Integration Order

1. **Foundation contract**
   - Finalize auth approach (token/session) and apply middleware policy.
   - Freeze shared DTO contracts for ticket list/detail and status vocabulary.

2. **Read-path first (TM-1/TM-2)**
   - Implement `GET /tickets` with pagination/filter/sort.
   - Implement `GET /tickets/:id` with full preview payload.
   - Implement timeline/activity/comments/attachments/notifications read endpoints.

3. **Master/wizard support (TM-3)**
   - Integrate existing master endpoints.
   - Add customer search + customer deployments/vehicles + missing master lookups (technicians/subcategories).
   - Align create-ticket request adapter from frontend model to backend DTO.

4. **Write operations (TM-4)**
   - Add assign/status/eta/charges mutation endpoints with validation and audit logging.
   - Ensure responses return updated aggregate for immediate preview refresh.

5. **Communication writes (TM-5)**
   - Add comment and attachment mutation APIs.
   - Add notification history endpoint backed by `NotificationLog`.

6. **Hardening**
   - Add API-level validation docs, error code matrix, and contract tests for TM flows.
   - Replace mock/local operations incrementally behind API adapters.

---

## Summary

Current runtime API exposure is limited to:
- Health check
- Master-data reads
- Ticket creation

All other TM-1..TM-5 frontend capabilities currently depend on mock data and local state operations and require dedicated read/update API contracts for production integration.
