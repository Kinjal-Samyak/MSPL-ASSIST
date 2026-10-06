import type { JobListItem } from '@/models';

/**
 * The single abstraction the My Jobs screen/hook depends on - same shape as
 * `repositories/auth/AuthRepository.ts` and `repositories/dashboard/DashboardRepository.ts`.
 * Nothing outside `repositories/jobs` may import `MockJobsRepository`/`ApiJobsRepository`
 * directly; see `index.ts` for the one place that chooses between them.
 */
export interface JobsRepository {
  getMyJobs(): Promise<JobListItem[]>;
}
