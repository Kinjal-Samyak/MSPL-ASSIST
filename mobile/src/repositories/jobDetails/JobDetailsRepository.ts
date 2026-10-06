import type { JobDetails } from '@/models';

/**
 * The single abstraction the Job Workspace screen/hook depends on - same shape as every other
 * repository in the app. Nothing outside `repositories/jobDetails` may import
 * `MockJobDetailsRepository`/`ApiJobDetailsRepository` directly; see `index.ts` for the one place
 * that chooses between them.
 */
export interface JobDetailsRepository {
  getJobDetails(jobId: string): Promise<JobDetails>;
}
