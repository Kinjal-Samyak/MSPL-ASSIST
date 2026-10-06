import type { JobDetails } from '@/models';
import type { JobDetailsRepository } from './JobDetailsRepository';

/**
 * The future production implementation. Deliberately inert - no Axios, no endpoints, no backend
 * calls. Implement against `apiClient` (see `@/api`), mapping the real `JobCardDetailDto` onto
 * `JobDetails`, once the backend exposes a technician-facing job details endpoint.
 */
export class ApiJobDetailsRepository implements JobDetailsRepository {
  async getJobDetails(_jobId: string): Promise<JobDetails> {
    throw new Error('ApiJobDetailsRepository is not implemented yet.');
  }
}
