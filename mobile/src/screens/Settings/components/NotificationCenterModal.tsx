import { Bell, Briefcase, Info, MessageSquare, RefreshCw, X } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, EmptyState, Loader, Typography } from '@/components';
import { useNotifications, useTheme } from '@/hooks';
import { formatDateTime } from '@/utils';
import type { AppNotification, NotificationType } from '@/models';
import type { StatCardIconProps } from '@/components';

const TYPE_ICON: Record<NotificationType, ComponentType<StatCardIconProps>> = {
  NEW_JOB: Briefcase,
  COORDINATOR_UPDATE: MessageSquare,
  WORKFLOW_UPDATE: RefreshCw,
  SYSTEM: Info,
  REMINDER: Bell,
};

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Uses mock data only (Part 4) - no push provider integration. Depends only on
 * `useNotifications()` (wrapping `platformFacade`). */
export function NotificationCenterModal({ isOpen, onClose }: NotificationCenterModalProps) {
  const { theme } = useTheme();
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View
          style={[
            styles.header,
            { paddingTop: theme.spacing['3xl'], paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
          ]}
        >
          <Typography variant="h3">Notifications</Typography>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close notifications" hitSlop={12} style={styles.closeButton}>
            <X size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        {unreadCount > 0 ? (
          <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm, alignItems: 'flex-end' }}>
            <Button label="Mark all as read" variant="ghost" size="sm" onPress={markAllAsRead} accessibilityLabel="Mark all notifications as read" />
          </View>
        ) : null}

        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {isLoading ? (
            <Loader label="Loading notifications..." />
          ) : error ? (
            <Typography variant="body" color="danger">
              {error}
            </Typography>
          ) : notifications.length === 0 ? (
            <EmptyState title="No notifications" description="You're all caught up." />
          ) : (
            notifications.map((notification: AppNotification, index) => {
              const Icon = TYPE_ICON[notification.type];
              return (
                <View key={notification.id}>
                  <Pressable
                    onPress={() => !notification.isRead && markAsRead(notification.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${notification.title}. ${notification.isRead ? 'Read' : 'Unread'}`}
                    style={[styles.row, { paddingVertical: theme.spacing.md, gap: theme.spacing.md }]}
                  >
                    <View
                      style={[
                        styles.iconChip,
                        {
                          backgroundColor: notification.isRead ? theme.colors.secondaryMuted : theme.colors.primaryMuted,
                          borderRadius: theme.radius.md,
                        },
                      ]}
                    >
                      <Icon size={16} color={notification.isRead ? theme.colors.textSecondary : theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Typography variant="body" style={{ fontWeight: notification.isRead ? '400' : '600' }}>
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                        {formatDateTime(notification.createdAt)}
                      </Typography>
                    </View>
                  </Pressable>
                  {index < notifications.length - 1 ? <Divider /> : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconChip: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
