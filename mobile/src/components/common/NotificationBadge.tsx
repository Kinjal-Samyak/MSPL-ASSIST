import { StyleSheet, View } from 'react-native';
import { useNotifications } from '@/hooks';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

/** Self-contained (reads `useNotifications()` itself) - a small unread-count badge reusable
 * anywhere a notification entry point needs one. Renders nothing when there's nothing unread. */
export function NotificationBadge() {
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) {
    return null;
  }

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.danger, borderColor: theme.colors.background }]}>
      <Typography variant="caption" color="onPrimary" style={styles.text}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: {
    fontSize: 10,
    lineHeight: 12,
  },
});
