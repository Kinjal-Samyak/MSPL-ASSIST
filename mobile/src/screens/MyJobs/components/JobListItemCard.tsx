import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { formatDateTime, getPriorityBadgeVariant, getPriorityLabel, getStatusBadgeVariant } from '@/utils';
import type { JobListItem } from '@/models';

export interface JobListItemCardProps {
  job: JobListItem;
  onPress: (job: JobListItem) => void;
}

function JobListItemCardComponent({ job, onPress }: JobListItemCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(job)}
      accessibilityRole="button"
      accessibilityLabel={`Job ${job.jobNumber}, ${job.statusLabel}, ${getPriorityLabel(job.priority)} priority`}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : theme.opacity.opaque })}
    >
      <Card>
        <View style={styles.headerRow}>
          <Typography variant="title">{job.jobNumber}</Typography>
          <Badge label={job.statusLabel} variant={getStatusBadgeVariant(job.status)} />
        </View>
        <Typography variant="body" color="textSecondary" style={{ marginTop: 4 }}>
          {job.customerName}
        </Typography>
        <View style={[styles.footerRow, { marginTop: theme.spacing.md }]}>
          <Badge label={getPriorityLabel(job.priority)} variant={getPriorityBadgeVariant(job.priority)} />
          <Typography variant="caption" color="textSecondary">
            {job.vehicleType ?? 'Vehicle type unavailable'} &middot; Updated {formatDateTime(job.updatedAt)}
          </Typography>
        </View>
      </Card>
    </Pressable>
  );
}

export const JobListItemCard = memo(JobListItemCardComponent);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
