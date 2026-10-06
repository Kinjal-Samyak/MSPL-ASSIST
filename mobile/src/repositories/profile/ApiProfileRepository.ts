import type { TechnicianProfile } from '@/models';
import type { ProfileRepository } from './ProfileRepository';

/** The future production implementation. Deliberately inert - no Axios, no endpoints. Implement
 * against `apiClient` once the backend exposes these fields (see `models/profile.models.ts` for
 * which ones already map to real `User` columns). */
export class ApiProfileRepository implements ProfileRepository {
  async getProfile(): Promise<TechnicianProfile> {
    throw new Error('ApiProfileRepository is not implemented yet.');
  }
}
