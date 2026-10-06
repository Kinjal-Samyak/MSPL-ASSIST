import { useEffect, useRef } from 'react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store';

export function AuthSessionBootstrap() {
  const initializedRef = useRef(false);
  const {
    accessToken,
    refreshToken,
    isAuthenticated,
    setSession,
    setUser,
    clearSession,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    async function restoreSession(): Promise<void> {
      if (!isAuthenticated || (!accessToken && !refreshToken)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        try {
          const currentUser = await authService.me();
          setUser(currentUser);
          return;
        } catch (error) {
          void error;
        }

        if (!refreshToken) {
          clearSession();
          return;
        }

        const refreshed = await authService.refresh({ refreshToken });
        setSession(refreshed.user, refreshed.tokens.accessToken, refreshed.tokens.refreshToken);
      } catch (error) {
        void error;
        clearSession();
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, [accessToken, clearSession, isAuthenticated, refreshToken, setLoading, setSession, setUser]);

  return null;
}
