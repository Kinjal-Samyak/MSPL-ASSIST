import type { AuthSession, AuthTokens } from '@/types';
import type { AuthRepository, LoginCredentials } from './AuthRepository';

/**
 * The future production implementation. Deliberately inert: no Axios, no endpoints, no backend
 * calls - it exists only to establish that the contract is implementable, and to give the
 * repository factory (`index.ts`) something real to switch to once the backend's auth endpoints
 * exist. Implement each method against `apiClient` (see `@/api`) at that point.
 */
export class ApiAuthRepository implements AuthRepository {
  async signIn(_credentials: LoginCredentials): Promise<AuthSession> {
    throw new Error('ApiAuthRepository is not implemented yet.');
  }

  async signOut(): Promise<void> {
    throw new Error('ApiAuthRepository is not implemented yet.');
  }

  async restoreSession(): Promise<AuthSession | null> {
    throw new Error('ApiAuthRepository is not implemented yet.');
  }

  async refreshToken(_refreshToken: string): Promise<AuthTokens> {
    throw new Error('ApiAuthRepository is not implemented yet.');
  }
}
