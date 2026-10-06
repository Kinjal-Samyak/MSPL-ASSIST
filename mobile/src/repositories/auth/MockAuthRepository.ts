import { ApiError } from '@/api';
import { sessionManager } from '@/services';
import type { AuthSession, AuthTokens, User } from '@/types';
import type { AuthRepository, LoginCredentials } from './AuthRepository';

/**
 * TEMPORARY. The only concrete `AuthRepository` used while there is no backend to talk to -
 * simulates the future API's behaviour (including its failure modes) without any network call.
 * Delete alongside the mock-only bits of `index.ts` once `ApiAuthRepository` is real; nothing
 * above this layer (AuthProvider, hooks, screens) will need to change when that happens.
 *
 * Never returns anything resembling real technician/business data - `MOCK_USER` is an obviously
 * synthetic placeholder, not a seeded account.
 */
const SIMULATED_LATENCY_MS = 700;

const MOCK_USER: User = {
  id: 'mock-session-user',
  name: 'Mock User',
  email: 'mock.user@example.com',
  role: 'TECHNICIAN',
};

const MOCK_TOKENS: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  tokenType: 'Bearer',
  accessTokenExpiresInSeconds: 3600,
  refreshTokenExpiresInSeconds: 60 * 60 * 24 * 7,
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidSession(session: AuthSession | null): session is AuthSession {
  return Boolean(session?.user?.id && session?.tokens?.accessToken);
}

export class MockAuthRepository implements AuthRepository {
  /**
   * Three reserved passwords exercise the Login screen's error-handling paths without a backend:
   * "invalid" -> invalid credentials, "network" -> connectivity failure, "servererror" -> an
   * unexpected server error. Any other password succeeds. Dev-only sentinels, not real accounts.
   */
  async signIn({ password }: LoginCredentials): Promise<AuthSession> {
    await wait(SIMULATED_LATENCY_MS);

    if (password === 'invalid') {
      throw new ApiError('Invalid mobile number or password.', { statusCode: 401 });
    }
    if (password === 'network') {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', {
        isNetworkError: true,
      });
    }
    if (password === 'servererror') {
      throw new ApiError('Something went wrong. Please try again.', { statusCode: 500 });
    }

    const session: AuthSession = { user: MOCK_USER, tokens: MOCK_TOKENS };
    await sessionManager.persist(session);
    return session;
  }

  async signOut(): Promise<void> {
    await sessionManager.clear();
  }

  async restoreSession(): Promise<AuthSession | null> {
    const session = await sessionManager.restore();
    if (!isValidSession(session)) {
      // Corrupted or partial data slipped into storage somehow - self-heal rather than handing a
      // broken user/tokens pair back to AuthProvider.
      if (session) await sessionManager.clear();
      return null;
    }
    return session;
  }

  async refreshToken(_refreshToken: string): Promise<AuthTokens> {
    await wait(SIMULATED_LATENCY_MS);
    return MOCK_TOKENS;
  }
}
