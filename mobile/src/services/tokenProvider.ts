import { useAuthStore } from '@/store';

/**
 * Decouples the API client from the state-management choice: `api/client.ts` asks this for the
 * current token instead of importing the Zustand store directly. If session state ever moves off
 * Zustand, only this file changes.
 */
export interface TokenProvider {
  getAccessToken(): string | null;
}

export const tokenProvider: TokenProvider = {
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
};
