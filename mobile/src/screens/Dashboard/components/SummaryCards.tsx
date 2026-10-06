import type { ComponentType } from 'react';
import { AlertTriangle, Briefcase, CheckCircle2, Clock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { StatCard, type StatCardIconProps, type StatCardTone } from '@/components';
import { useTheme } from '@/hooks';
import type { JobsSummary } from '@/models';

interface SummaryCardDefinition {
  id: keyof JobsSummary;
  label: string;
  icon: ComponentType<StatCardIconProps>;
  tone: StatCardTone;
}

/**
 * Config-driven, not one hardcoded StatCard per metric - adding, removing, or reordering a
 * summary tile (or a future metric the backend starts sending) is a one-line change here, not a
 * change to the render logic below.
 */
const SUMMARY_CARD_DEFINITIONS: SummaryCardDefinition[] = [
  { id: 'assigned', label: 'Assigned Jobs', icon: Briefcase, tone: 'blue' },
  { id: 'completedToday', label: 'Completed Today', icon: CheckCircle2, tone: 'emerald' },
  { id: 'pending', label: 'Pending Jobs', icon: Clock, tone: 'amber' },
  { id: 'urgent', label: 'Urgent Jobs', icon: AlertTriangle, tone: 'rose' },
];

export interface SummaryCardsProps {
  summary: JobsSummary;
}

/** Today's Summary - StatCards in a 2x2 grid, matching the web app's StatCard tile exactly. */
export function SummaryCards({ summary }: SummaryCardsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.grid, { gap: theme.spacing.md }]}>
      {SUMMARY_CARD_DEFINITIONS.map((definition) => (
        <View key={definition.id} style={styles.cell}>
          <StatCard label={definition.label} value={summary[definition.id]} icon={definition.icon} tone={definition.tone} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
  },
});
