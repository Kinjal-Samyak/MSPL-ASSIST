import { memo } from 'react';
import { ArrowLeft, RotateCw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Typography } from '@/components';
import { useTheme } from '@/hooks';
import {
  getPriorityBadgeVariant,
  getPriorityLabel,
  getRideabilityBadgeVariant,
  getRideabilityLabel,
  getStatusBadgeVariant,
} from '@/utils';
import type { JobCardStage, OperationalPriority, RideabilityStatus } from '@/models';

export interface JobWorkspaceHeaderProps {
  jobNumber: string;
  status: JobCardStage | null;
  statusLabel: string | null;
  priority: OperationalPriority | null;
  rideabilityStatus: RideabilityStatus | null;
  onBack: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function JobWorkspaceHeaderComponent({
  jobNumber,
  status,
  statusLabel,
  priority,
  rideabilityStatus,
  onBack,
  onRefresh,
  isRefreshing,
}: JobWorkspaceHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to My Jobs"
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </Pressable>
        <Typography variant="h3" style={styles.title}>
          {jobNumber}
        </Typography>
        <Pressable
          onPress={onRefresh}
          disabled={isRefreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh job details"
          hitSlop={12}
          style={[styles.refreshButton, { opacity: isRefreshing ? theme.opacity.disabled : theme.opacity.opaque }]}
        >
          <RotateCw size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      <View style={[styles.badgeRow, { gap: theme.spacing.sm }]}>
        {status && statusLabel ? <Badge label={statusLabel} variant={getStatusBadgeVariant(status)} /> : null}
        {priority ? <Badge label={getPriorityLabel(priority)} variant={getPriorityBadgeVariant(priority)} /> : null}
        {rideabilityStatus ? (
          <Badge label={getRideabilityLabel(rideabilityStatus)} variant={getRideabilityBadgeVariant(rideabilityStatus)} />
        ) : null}
      </View>
    </View>
  );
}

export const JobWorkspaceHeader = memo(JobWorkspaceHeaderComponent);

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
