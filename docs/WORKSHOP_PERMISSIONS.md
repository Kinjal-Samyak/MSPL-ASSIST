# Workshop Permissions

This is the target role model. Current platform roles are `ADMIN`, `COORDINATOR`, and `TECHNICIAN`; **Workshop Manager** and **Customer** are future roles and must not be implied by current authorization code.

| Capability | Coordinator | Technician | Workshop Manager (future) | Administrator | Customer (future) |
| --- | --- | --- | --- | --- | --- |
| Read Cases | Hub/operational scope | Assigned/hub scope | All managed scope | All | Own Ticket summary only |
| Create Case | System-created from Ticket only | No | No | Controlled/manual recovery only | No |
| Review/resolve Case | Yes | Consultation outcome only | Yes | Yes | No |
| Assign/reassign technician | Yes | No | Yes | Yes | No |
| Request/respond consultation | Assign/manage | Request/respond when assigned | Manage | Manage | No |
| Create Job Card | System after Repair Required | No | System trigger only | Recovery only | No |
| Record inspection/diagnosis/repair/QC | View/notes only | Assigned Job Card | Review | Audited override | No |
| Move Job Card to Ready | No | Assigned technician / authorised QC actor | Audited override | Audited override | No |
| Record delivery/closure | Integration/coordinator scope | No | Yes | Yes | Confirmation only if enabled |
| Read audit trail | Scope-limited | Scope-limited | All managed scope | All | No |

All access is enforced server-side using authenticated role plus hub/assignment scope. UI visibility is never authorization. Historical audit/timeline records cannot be deleted by any role.
