import type { DashboardData } from '@/models';
import type { DashboardRepository } from './DashboardRepository';

/**
 * TEMPORARY. The only concrete `DashboardRepository` used while there is no backend to talk to -
 * returns fixed, obviously-synthetic development data so the Dashboard UI has something real to
 * render and refresh. Delete alongside the mock-only branch of `index.ts` once
 * `ApiDashboardRepository` is real; nothing above this layer needs to change when that happens.
 */
const SIMULATED_LATENCY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_DASHBOARD: DashboardData = {
  technician: {
    employeeId: 'EMP-0000',
    hub: 'Demo Hub',
    status: 'ON_DUTY',
  },
  jobsSummary: {
    assigned: 8,
    completedToday: 3,
    pending: 5,
    urgent: 1,
  },
  notifications: {
    unreadCount: 2,
  },
  quickActions: [
    { id: 'my-jobs', label: 'My Jobs', route: 'MyJobs' },
    { id: 'profile', label: 'Profile', route: 'Profile' },
    { id: 'settings', label: 'Settings', route: 'Settings' },
  ],
  // Empty by design - "No recent activity" is the real, correct state until an actual feed
  // exists. RecentActivity already renders a genuine list the moment this is non-empty.
  recentActivity: [],
};

export class MockDashboardRepository implements DashboardRepository {
  async getDashboard(): Promise<DashboardData> {
    await wait(SIMULATED_LATENCY_MS);
    return MOCK_DASHBOARD;
  }
}
