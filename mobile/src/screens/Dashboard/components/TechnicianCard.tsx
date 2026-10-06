import { StyleSheet, View } from 'react-native';
import { Badge, Card, Divider, Typography, type BadgeVariant } from '@/components';
import { useTheme } from '@/hooks';
import type { TechnicianStatus, TechnicianSummary } from '@/models';

const STATUS_LABEL: Record<TechnicianStatus, string> = {
  ON_DUTY: 'On Duty',
  OFF_DUTY: 'Off Duty',
  ON_BREAK: 'On Break',
};

const STATUS_VARIANT: Record<TechnicianStatus, BadgeVariant> = {
  ON_DUTY: 'success',
  OFF_DUTY: 'neutral',
  ON_BREAK: 'warning',
};

export interface TechnicianCardProps {
  technicianName: string;
  summary: TechnicianSummary;
}

export function TechnicianCard({ technicianName, summary }: TechnicianCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <View style={styles.headerRow}>
        <Typography variant="title">{technicianName}</Typography>
        <Badge label={STATUS_LABEL[summary.status]} variant={STATUS_VARIANT[summary.status]} />
      </View>
      <Divider inset={theme.spacing.md} />
      <View style={styles.detailRow}>
        <Typography variant="caption" color="textSecondary">
          Employee ID
        </Typography>
        <Typography variant="body">{summary.employeeId}</Typography>
      </View>
      <View style={[styles.detailRow, { marginTop: theme.spacing.sm }]}>
        <Typography variant="caption" color="textSecondary">
          Current Hub
        </Typography>
        <Typography variant="body">{summary.hub}</Typography>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
