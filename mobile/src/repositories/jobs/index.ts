import { env } from '@/config';
import { ApiJobsRepository } from './ApiJobsRepository';
import { MockJobsRepository } from './MockJobsRepository';
import type { JobsRepository } from './JobsRepository';

export type { JobsRepository } from './JobsRepository';
export { MockJobsRepository } from './MockJobsRepository';
export { ApiJobsRepository } from './ApiJobsRepository';

/** The one place that decides which `JobsRepository` implementation is active - same pattern as `repositories/auth` and `repositories/dashboard`. */
function createJobsRepository(): JobsRepository {
  if (env.appEnv === 'production') {
    return new ApiJobsRepository();
  }
  return new MockJobsRepository();
}

export const jobsRepository: JobsRepository = createJobsRepository();
