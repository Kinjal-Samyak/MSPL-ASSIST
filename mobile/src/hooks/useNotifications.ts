import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { platformFacade } from '@/facades/platform';
import type { AppNotification } from '@/models';

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => Promise<void>;
}

const NOTIFICATIONS_QUERY_KEY = ['notifications'];

/** Depends only on `platformFacade`. */
export function useNotifications(): UseNotificationsResult {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: NOTIFICATIONS_QUERY_KEY, queryFn: () => platformFacade.getNotifications() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => platformFacade.markNotificationAsRead(id),
    onSuccess: invalidate,
  });
  const markAllAsReadMutation = useMutation({
    mutationFn: () => platformFacade.markAllNotificationsAsRead(),
    onSuccess: invalidate,
  });

  const notifications = query.data ?? [];

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    isLoading: query.isLoading,
    error: query.isError ? normalizeError(query.error).message : null,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    refresh: async () => {
      await query.refetch();
    },
  };
}
