import { env } from '@/config';
import { ApiJobDetailsRepository } from './ApiJobDetailsRepository';
import { MockJobDetailsRepository } from './MockJobDetailsRepository';
import type { JobDetailsRepository } from './JobDetailsRepository';

export type { JobDetailsRepository } from './JobDetailsRepository';
export { MockJobDetailsRepository } from './MockJobDetailsRepository';
export { ApiJobDetailsRepository } from './ApiJobDetailsRepository';

/** The one place that decides which `JobDetailsRepository` implementation is active - same pattern as every other repository factory in the app. */
function createJobDetailsRepository(): JobDetailsRepository {
  if (env.appEnv === 'production') {
    return new ApiJobDetailsRepository();
  }
  return new MockJobDetailsRepository();
}

export const jobDetailsRepository: JobDetailsRepository = createJobDetailsRepository();
