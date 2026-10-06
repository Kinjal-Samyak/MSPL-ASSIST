# Admin Module Specification

## 1. Module Purpose
### Business objective
Provide tenant governance capabilities for user lifecycle, role-based access control, integration setup, audit monitoring, and operational policy management.

### Primary users
- Platform Admin
- Security/Compliance Admin

### Business value
- Strengthens security and compliance.
- Ensures controlled access and policy consistency.
- Reduces operational risk through auditability.

---

## 2. Features
### Must Have
- User management (create, activate/deactivate, reset access).
- Role and permission management.
- Integration configuration (channel credentials, API keys references).
- Audit log exploration.
- Tenant policy settings (password/session/security).

### Should Have
- Role templates and cloning.
- Approval workflow for high-risk admin actions.
- Policy change simulation mode.

### Future
- AI security anomaly detection.
- Just-in-time privileged access.
- Automated compliance posture scoring.

---

## 3. Screen List
- Admin Overview
- User Management
- User Detail
- Roles & Permissions
- Integrations
- Audit Logs
- Tenant Policies
- Modals/Drawers:
  - Create User Modal
  - Assign Role Drawer
  - Deactivate User Dialog
  - Edit Permission Matrix Modal
  - Rotate Integration Secret Dialog
  - Audit Filter Drawer

---

## 4. User Flow
### Happy path
1. Admin creates user and assigns role.
2. User receives invite and activates account.
3. Admin monitors activity in audit logs.
4. Admin updates integration/policy settings as needed.

### Alternative paths
- Temporary role elevation with expiry.
- User suspension and reactivation.

### Exception paths
- Policy update violates compliance baseline and is blocked.
- Role assignment creates forbidden privilege combination.
- Integration health check fails after credential update.

---

## 5. UI Components
- Admin summary cards
- User table with status controls
- Permission matrix grid
- Audit timeline/table with advanced filters
- Secret management confirmation dialogs
- Empty/loading/error states

---

## 6. Data Required

| Field | Type | Required | Read Only | Editable | Validation |
|---|---|---:|---:|---:|---|
| userId | string | Yes | Yes | No | unique |
| email | string | Yes | No | Yes | valid + unique |
| fullName | string | Yes | No | Yes | 3..120 chars |
| roleIds[] | string[] | Yes | No | Yes | valid roles |
| userStatus | enum | Yes | No | Yes | ACTIVE/SUSPENDED/INVITED |
| permissionOverrides | object | No | No | Yes | allowed scopes only |
| integrationId | string | Yes | Yes | No | existing integration |
| integrationEnabled | boolean | Yes | No | Yes | boolean |
| policy.sessionTimeoutMins | number | Yes | No | Yes | min/max policy |
| policy.passwordComplexity | enum | Yes | No | Yes | allowed policy values |
| auditLog.eventType | enum | Yes | Yes | No | system generated |
| auditLog.actorUserId | string | Yes | Yes | No | existing user |

---

## 7. API Requirements

### Required endpoints
- `GET /admin/users`
- `POST /admin/users`
- `GET /admin/users/{id}`
- `PATCH /admin/users/{id}`
- `POST /admin/users/{id}/deactivate`
- `GET /admin/roles`
- `POST /admin/roles`
- `PATCH /admin/roles/{id}`
- `GET /admin/permissions`
- `GET /admin/integrations`
- `PATCH /admin/integrations/{id}`
- `GET /admin/audit-logs`
- `GET /admin/policies`
- `PATCH /admin/policies`

### Error responses
- `400` invalid policy/permission data
- `403` forbidden admin scope
- `404` user/role/integration not found
- `409` conflict (duplicate email/role name)
- `422` policy violation

### Pagination/filtering/sorting
- Users and audit logs paginated.
- Audit filters by actor, event type, entity, date range.
- Sort by created/updated/event time.

---

## 8. Business Rules
- Least-privilege principle enforced.
- No user may remove the last active platform admin.
- High-risk actions (role matrix edit, integration credential changes) require confirmation and audit reason.
- Integration secrets never displayed in plain text after save.
- Policy changes apply per tenant and are versioned.

---

## 9. Permissions

| Action | Admin | Ops Manager | Coordinator | Technician | Fleet Supervisor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Create | ✓ |  |  |  |  |  |
| Read | ✓ | Limited (audit subset) |  |  |  |  |
| Update | ✓ |  |  |  |  |  |
| Delete | ✓ (controlled) |  |  |  |  |  |
| Export | ✓ | Limited (audit subset) |  |  |  |  |
| Approve | ✓ | Optional delegated |  |  |  |  |
| Reject | ✓ | Optional delegated |  |  |  |  |

---

## 10. Acceptance Criteria
- User lifecycle actions work with proper validation and audit logs.
- RBAC updates enforce permission consistency.
- Integration setting changes are secure and auditable.
- Audit logs are queryable by required dimensions and exportable.
- Policy changes enforce constraints and persist correctly.

---

## 11. Future Enhancements
- AI-assisted role anomaly detection.
- Automated segregation-of-duties conflict scanning.
- Compliance-ready control evidence packs generation.
