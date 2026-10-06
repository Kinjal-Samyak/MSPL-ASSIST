import type { UserRole } from "@mspl/shared-constants";

/** Per-report-key RBAC, replacing the reports router's single blanket ADMIN+COORDINATOR gate.
 * Legacy 7 keys keep today's exact access (ADMIN+COORDINATOR) - new report types added in later
 * slices extend this map with their own (potentially broader) role lists without needing to
 * touch the router's gating mechanism again. */
export const REPORT_ACCESS: Record<string, UserRole[]> = {
  tickets: ["ADMIN", "COORDINATOR"],
  customers: ["ADMIN", "COORDINATOR"],
  vehicles: ["ADMIN", "COORDINATOR"],
  deployments: ["ADMIN", "COORDINATOR"],
  workshop: ["ADMIN", "COORDINATOR"],
  notifications: ["ADMIN", "COORDINATOR"],
  admin: ["ADMIN", "COORDINATOR"],
};

export const REPORT_TITLES: Record<string, string> = {
  tickets: "Ticket Reports",
  customers: "Customer Reports",
  vehicles: "Vehicle Reports",
  deployments: "Deployment Reports",
  workshop: "Workshop Reports",
  notifications: "Notification Reports",
  admin: "Admin Reports",
};
