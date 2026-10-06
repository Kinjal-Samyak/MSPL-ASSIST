import type { TechnicianProfile } from '@/models';
import type { ProfileRepository } from './ProfileRepository';

/** TEMPORARY. Fixed, obviously-synthetic supplementary profile data - not a real employee record.
 * Delete alongside the mock-only branch of `index.ts` once `ApiProfileRepository` is real. */
const LATENCY_MS = 300;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_PROFILE: TechnicianProfile = {
  employeeId: 'EMP-0000',
  assignedHub: 'Demo Hub',
  designation: 'Field Technician',
  mobileNumber: '9000000000',
  profilePhotoUrl: null,
};

export class MockProfileRepository implements ProfileRepository {
  async getProfile(): Promise<TechnicianProfile> {
    await wait(LATENCY_MS);
    return MOCK_PROFILE;
  }
}
