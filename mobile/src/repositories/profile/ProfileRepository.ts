import type { TechnicianProfile } from '@/models';

/** Supplementary profile fields only - name/email/role already come from `useAuth()`. Same shape
 * as every other repository. */
export interface ProfileRepository {
  getProfile(): Promise<TechnicianProfile>;
}
