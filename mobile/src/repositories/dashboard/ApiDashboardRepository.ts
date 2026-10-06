import type { DashboardData } from '@/models';
import type { DashboardRepository } from './DashboardRepository';

/**
 * The future production implementation. Deliberately inert - no Axios, no endpoints, no backend
 * calls - it exists only to establish that the contract is implementable, and to give the
 * repository factory (`index.ts`) something real to switch to once the backend exposes a
 * dashboard summary endpoint. Implement against `apiClient` (see `@/api`) at that point.
 */
export class ApiDashboardRepository implements DashboardRepository {
  async getDashboard(): Promise<DashboardData> {
    throw new Error('ApiDashboardRepository is not implemented yet.');
  }
}
