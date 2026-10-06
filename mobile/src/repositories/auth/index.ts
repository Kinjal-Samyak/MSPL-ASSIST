import { env } from '@/config';
import { ApiAuthRepository } from './ApiAuthRepository';
import { MockAuthRepository } from './MockAuthRepository';
import type { AuthRepository } from './AuthRepository';

export type { AuthRepository, LoginCredentials } from './AuthRepository';
export { MockAuthRepository } from './MockAuthRepository';
export { ApiAuthRepository } from './ApiAuthRepository';

/**
 * The one place that decides which `AuthRepository` implementation is active. Everything else in
 * the app imports `authRepository` from here and never touches `MockAuthRepository` or
 * `ApiAuthRepository` by name - wiring up the real backend later means changing this function's
 * body only.
 */
function createAuthRepository(): AuthRepository {
  if (env.appEnv === 'production') {
    return new ApiAuthRepository();
  }
  return new MockAuthRepository();
}

export const authRepository: AuthRepository = createAuthRepository();
