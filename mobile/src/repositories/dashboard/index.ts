import { env } from '@/config';
import { ApiDashboardRepository } from './ApiDashboardRepository';
import { MockDashboardRepository } from './MockDashboardRepository';
import type { DashboardRepository } from './DashboardRepository';

export type { DashboardRepository } from './DashboardRepository';
export { MockDashboardRepository } from './MockDashboardRepository';
export { ApiDashboardRepository } from './ApiDashboardRepository';

/**
 * The one place that decides which `DashboardRepository` implementation is active - same pattern
 * as `repositories/auth/index.ts`. Everything else imports `dashboardRepository` from here and
 * never touches `MockDashboardRepository`/`ApiDashboardRepository` by name.
 */
function createDashboardRepository(): DashboardRepository {
  if (env.appEnv === 'production') {
    return new ApiDashboardRepository();
  }
  return new MockDashboardRepository();
}

export const dashboardRepository: DashboardRepository = createDashboardRepository();
