import { env } from '@/config';
import { ApiProfileRepository } from './ApiProfileRepository';
import { MockProfileRepository } from './MockProfileRepository';
import type { ProfileRepository } from './ProfileRepository';

export type { ProfileRepository } from './ProfileRepository';
export { MockProfileRepository } from './MockProfileRepository';
export { ApiProfileRepository } from './ApiProfileRepository';

function createProfileRepository(): ProfileRepository {
  if (env.appEnv === 'production') {
    return new ApiProfileRepository();
  }
  return new MockProfileRepository();
}

export const profileRepository: ProfileRepository = createProfileRepository();
