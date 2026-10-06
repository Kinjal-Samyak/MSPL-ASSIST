import { Bell } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Avatar, Typography } from '@/components';
import { useTheme } from '@/hooks';

export interface DashboardHeaderProps {
  technicianName: string;
  unreadNotificationsCount: number;
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** No notification functionality yet - the bell is a static placeholder with an unread count from `DashboardData`, not an interactive entry point. */
export function DashboardHeader({ technicianName, unreadNotificationsCount }: DashboardHeaderProps) {
  const { theme } = useTheme();
  const greeting = getGreeting(new Date().getHours());

  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        <Avatar name={technicianName} size={44} />
        <View style={{ marginLeft: theme.spacing.md }}>
          <Typography variant="caption" color="textSecondary">
            {greeting}
          </Typography>
          <Typography variant="h3">{technicianName}</Typography>
          <Typography variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
            {getFormattedDate()}
          </Typography>
        </View>
      </View>

      <View accessibilityLabel="Notifications" style={styles.bellWrapper}>
        <Bell size={22} color={theme.colors.textSecondary} />
        {unreadNotificationsCount > 0 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.danger, borderColor: theme.colors.background },
            ]}
          >
            <Typography variant="caption" color="onPrimary" style={styles.badgeText}>
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </Typography>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  bellWrapper: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});
