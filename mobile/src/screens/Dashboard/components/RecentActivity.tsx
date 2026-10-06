import { ClipboardList } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, Divider, EmptyState, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { formatDateTime } from '@/utils';
import type { ActivityEntry } from '@/models';

export interface RecentActivityProps {
  activities: ActivityEntry[];
}

/** Collection-driven: renders a real feed the moment `activities` is non-empty, and the shared
 * EmptyState (not a one-off message) while it's genuinely empty. */
export function RecentActivity({ activities }: RecentActivityProps) {
  const { theme } = useTheme();

  if (activities.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState
          title="No recent activity"
          description="Job updates will appear here once you start working."
          icon={<ClipboardList size={28} color={theme.colors.textSecondary} />}
        />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      {activities.map((activity, index) => (
        <View key={activity.id}>
          <View style={{ padding: theme.spacing.lg }}>
            <Typography variant="body">{activity.description}</Typography>
            <Typography variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
              {formatDateTime(activity.performedAt)}
            </Typography>
          </View>
          {index < activities.length - 1 ? <Divider /> : null}
        </View>
      ))}
    </Card>
  );
}
