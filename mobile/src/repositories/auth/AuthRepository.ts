import type { AuthSession, AuthTokens } from '@/types';

export interface LoginCredentials {
  mobileNumber: string;
  password: string;
}

/**
 * The single abstraction every other layer (AuthProvider, hooks, screens) is allowed to depend
 * on for authentication operations. Nothing outside `repositories/auth` may import
 * `MockAuthRepository` or `ApiAuthRepository` directly - see `index.ts` for the one place that's
 * allowed to choose between them.
 *
 * Contracts only: no implementation, no storage access, no network calls live in this file.
 */
export interface AuthRepository {
  signIn(credentials: LoginCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
}
