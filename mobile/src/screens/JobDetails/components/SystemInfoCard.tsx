import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { formatDateTime } from '@/utils';
import type { JobSystemInfo } from '@/models';

export interface SystemInfoCardProps {
  system: JobSystemInfo;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="mono" style={styles.value}>
        {value}
      </Typography>
    </View>
  );
}

function SystemInfoCardComponent({ system }: SystemInfoCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <Typography variant="title">System Information</Typography>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <Row label="Job ID" value={system.jobId} />
        <Row label="Linked Ticket ID" value={system.linkedTicketId} />
        <Row label="Last Sync" value={formatDateTime(system.lastSyncedAt)} />
        <Row label="Application Version" value={`v${system.appVersion}`} />
      </View>
    </Card>
  );
}

export const SystemInfoCard = memo(SystemInfoCardComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
