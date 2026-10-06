import { STORAGE_KEYS } from '@/constants';
import type { AuthSession } from '@/types';
import { secureStorage } from './secureStorage';

/**
 * Persists/restores the auth session as an opaque blob. Deliberately dumb: no token verification,
 * no expiry checks, no network calls - it only moves whatever `AuthSession` it's given in and out
 * of secure storage. Login, refresh, and expiry handling are business logic for a later phase.
 */
export const sessionManager = {
  async persist(session: AuthSession): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.authSession, JSON.stringify(session));
  },

  async restore(): Promise<AuthSession | null> {
    const raw = await secureStorage.getItem(STORAGE_KEYS.authSession);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await secureStorage.removeItem(STORAGE_KEYS.authSession);
  },
};
