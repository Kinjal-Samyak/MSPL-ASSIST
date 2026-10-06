import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '@/api';
import { authRepository, type LoginCredentials } from '@/repositories/auth';
import { useAuthStore } from '@/store';
import type { User } from '@/types';

/**
 * Authentication Context: the only thing above it (screens, hooks, navigation) is ever allowed
 * to touch for auth operations. It depends solely on the `AuthRepository` abstraction
 * (`authRepository`, chosen once by the repository factory in `repositories/auth/index.ts`) -
 * never on `MockAuthRepository` or `ApiAuthRepository` by name. Swapping the mock repository for
 * a real one later is a one-line change in that factory; this file does not change.
 */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setInitializing = useAuthStore((state) => state.setInitializing);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setInitializing(true);
    authRepository
      .restoreSession()
      .then((session) => {
        if (isCancelled || !session) return;
        setSession(session.user, session.tokens);
      })
      .finally(() => {
        if (!isCancelled) setInitializing(false);
      });
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      void authRepository.signOut();
      clearSession();
    };
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = async (credentials: LoginCredentials) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const session = await authRepository.signIn(credentials);
      setSession(session.user, session.tokens);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signOut = async () => {
    await authRepository.signOut();
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isInitializing, isLoggingIn, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
