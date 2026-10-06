import type { JobListItem } from '@/models';
import type { JobsRepository } from './JobsRepository';

/**
 * The future production implementation. Deliberately inert - no Axios, no endpoints, no backend
 * calls - it exists only to establish that the contract is implementable. Implement against
 * `apiClient` (see `@/api`) once the backend exposes a "my job cards" endpoint.
 */
export class ApiJobsRepository implements JobsRepository {
  async getMyJobs(): Promise<JobListItem[]> {
    throw new Error('ApiJobsRepository is not implemented yet.');
  }
}
