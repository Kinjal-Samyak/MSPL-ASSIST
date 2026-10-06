import { create } from 'zustand';
import type { AuthTokens, User } from '@/types';

/**
 * Holds the current session in memory only - no persistence here. `sessionManager` is what
 * reads/writes secure storage; `AuthProvider` is what wires the two together on boot. No login
 * or refresh logic lives in this store, only the state shape and plain setters.
 */
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  /** True until the boot-time session restore attempt has finished - lets navigation hold on Splash instead of flashing the login screen. */
  isInitializing: boolean;
  setSession: (user: User, tokens: AuthTokens) => void;
  clearSession: () => void;
  setInitializing: (isInitializing: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isInitializing: true,
  setSession: (user, tokens) => set({ user, tokens, isAuthenticated: true, isInitializing: false }),
  clearSession: () => set({ user: null, tokens: null, isAuthenticated: false, isInitializing: false }),
  setInitializing: (isInitializing) => set({ isInitializing }),
}));
