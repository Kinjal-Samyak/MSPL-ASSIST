import type { DashboardData } from '@/models';

/**
 * The single abstraction the Dashboard screen/hook depends on - same shape as
 * `repositories/auth/AuthRepository.ts`. Nothing outside `repositories/dashboard` may import
 * `MockDashboardRepository` or `ApiDashboardRepository` directly; see `index.ts` for the one
 * place that chooses between them.
 */
export interface DashboardRepository {
  getDashboard(): Promise<DashboardData>;
}
