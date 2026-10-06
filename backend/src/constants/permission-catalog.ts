import type { Role } from "@prisma/client";

export interface PermissionCatalogEntry {
  code: string;
  description: string;
  category: string;
  defaultRoles: Role[];
}

/**
 * Service Manager (Amendment 1, Version 1.0) inherits every Administrator permission except
 * OPS_TICKETS_DELETE - the sole restricted capability. Every other entry below carries
 * "SERVICE_MANAGER" alongside "ADMIN" for exactly that reason; do not add it to OPS_TICKETS_DELETE.
 */
export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { code: "ADMIN_USERS_READ", description: "View user accounts and details.", category: "Users", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "COORDINATOR"] },
  { code: "ADMIN_USERS_WRITE", description: "Create, update, activate, deactivate, lock/unlock and reset passwords for users.", category: "Users", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "ADMIN_HUBS_READ", description: "View hub configuration.", category: "Hubs", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL"] },
  { code: "ADMIN_HUBS_WRITE", description: "Create and update hub configuration.", category: "Hubs", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "ADMIN_SETTINGS_READ", description: "View application, notification and master settings.", category: "Settings", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "COORDINATOR"] },
  { code: "ADMIN_SETTINGS_WRITE", description: "Update application, notification and master settings.", category: "Settings", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "ADMIN_ROLES_PERMISSIONS_MANAGE", description: "View and modify the role/permission matrix.", category: "Roles & Permissions", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_SEARCH", description: "Search and view any ticket for operations administration.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_DELETE", description: "Soft-delete a ticket with a mandatory reason.", category: "Operations Administration", defaultRoles: ["ADMIN"] },
  { code: "OPS_TICKETS_RESTORE", description: "Restore a soft-deleted ticket.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_FORCE_CLOSE", description: "Force-close a ticket outside the normal workflow.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_TICKETS_REASSIGN", description: "Reassign a ticket's Service Engineer or Technician.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "OPS_JOBCARDS_UNLOCK_RFD", description: "Unlock a Ready for Delivery job card back to in-progress.", category: "Operations Administration", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "AUDIT_LOGS_READ", description: "View the centralized audit log.", category: "Audit", defaultRoles: ["ADMIN", "SERVICE_MANAGER"] },
  { code: "PROCUREMENT_SUPPLIERS_READ", description: "View the supplier master.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_SUPPLIERS_WRITE", description: "Create and update suppliers.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_REQUESTS_READ", description: "View procurement requests.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_REQUESTS_WRITE", description: "Raise a procurement request.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PROCUREMENT_REQUESTS_APPROVE", description: "Approve or reject a procurement request.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PURCHASE_ORDERS_READ", description: "View purchase orders.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PURCHASE_ORDERS_WRITE", description: "Create and edit draft purchase orders.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
  { code: "PURCHASE_ORDERS_ISSUE", description: "Issue or cancel a purchase order.", category: "Procurement", defaultRoles: ["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"] },
];
