/**
 * Presentation models for the Dashboard only - no ticket/job-card business logic. The Technician's
 * identity (name, avatar) already lives in `types/auth.types.ts`'s `User` and comes from
 * `useAuth()`, not from here, so it isn't duplicated in `TechnicianSummary`.
 */
export type TechnicianStatus = 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK';

export interface TechnicianSummary {
  employeeId: string;
  hub: string;
  status: TechnicianStatus;
}

export interface JobsSummary {
  assigned: number;
  completedToday: number;
  pending: number;
  urgent: number;
}

export interface NotificationsSummary {
  unreadCount: number;
}

export type QuickActionRoute = 'MyJobs' | 'Profile' | 'Settings';

export interface QuickAction {
  id: string;
  label: string;
  route: QuickActionRoute;
}

/** One row in the Recent Activity feed - collection-driven so the section can render a real list
 * the moment a repository starts returning entries, with no component changes. */
export interface ActivityEntry {
  id: string;
  description: string;
  performedAt: string;
}

export interface DashboardData {
  technician: TechnicianSummary;
  jobsSummary: JobsSummary;
  notifications: NotificationsSummary;
  quickActions: QuickAction[];
  recentActivity: ActivityEntry[];
}
