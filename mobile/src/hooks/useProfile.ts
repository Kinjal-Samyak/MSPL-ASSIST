import { useQuery } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { platformFacade } from '@/facades/platform';
import type { TechnicianProfile } from '@/models';
import type { User } from '@/types';
import { useAuth } from './useAuth';

interface UseProfileResult {
  user: User | null;
  profile: TechnicianProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Depends on `useAuth()` for identity (name/email/role - already real, from the session) and
 * `platformFacade` for supplementary fields. Never duplicates auth state, never touches
 * `AuthRepository`/`AuthProvider` directly. */
export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['profile'], queryFn: () => platformFacade.getProfile() });

  return {
    user,
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.isError ? normalizeError(query.error).message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
