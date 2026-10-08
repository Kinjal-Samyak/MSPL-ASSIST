import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { authService } from '@/services/authService';
import { ensureRentalToken } from '@/services/rentalUserService';
import type { LoginCredentials } from '@/types';

export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, refreshToken, setSession, clearSession, setLoading } =
    useAuthStore();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      try {
        const result = await authService.login(credentials);
        setSession(result.user, result.tokens.accessToken, result.tokens.refreshToken);
        void ensureRentalToken().catch(() => undefined);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    },
    [navigate, setSession, setLoading]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
    } finally {
      clearSession();
      setLoading(false);
    }
    navigate('/login');
  }, [navigate, clearSession, refreshToken, setLoading]);

  return { user, isAuthenticated, isLoading, login, logout };
}
