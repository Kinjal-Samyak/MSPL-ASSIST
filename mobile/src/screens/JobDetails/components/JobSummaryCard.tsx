import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Card, Divider, Typography } from '@/components';
import { useTheme } from '@/hooks';
import {
  formatDateTime,
  getPriorityBadgeVariant,
  getPriorityLabel,
  getRideabilityBadgeVariant,
  getRideabilityLabel,
  getStatusBadgeVariant,
} from '@/utils';
import type { JobDetails } from '@/models';

export interface JobSummaryCardProps {
  job: JobDetails;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </View>
  );
}

/** The primary information shown to technicians - always the first Card on the Job Workspace. */
function JobSummaryCardComponent({ job }: JobSummaryCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <View style={styles.headerRow}>
        <Typography variant="title">{job.jobNumber}</Typography>
        <Badge label={job.statusLabel} variant={getStatusBadgeVariant(job.status)} />
      </View>
      <View style={[styles.badgeRow, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
        <Badge label={getPriorityLabel(job.priority)} variant={getPriorityBadgeVariant(job.priority)} />
        {job.rideabilityStatus ? (
          <Badge label={getRideabilityLabel(job.rideabilityStatus)} variant={getRideabilityBadgeVariant(job.rideabilityStatus)} />
        ) : null}
      </View>

      <Divider inset={theme.spacing.md} />

      <View style={{ gap: theme.spacing.sm }}>
        <Row label="Assigned Date" value={job.assignedDate ? formatDateTime(job.assignedDate) : 'Not yet assigned'} />
        <Row label="Last Updated" value={formatDateTime(job.lastUpdated)} />
        <Row label="Assigned Hub" value={job.assignedHub ?? 'Not available'} />
        <Row label="Assigned Technician" value={job.assignedTechnicianName ?? 'You'} />
      </View>
    </Card>
  );
}

export const JobSummaryCard = memo(JobSummaryCardComponent);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
