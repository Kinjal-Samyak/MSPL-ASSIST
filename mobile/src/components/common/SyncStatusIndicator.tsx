import { AlertCircle, Check, RefreshCw } from 'lucide-react-native';
import { View } from 'react-native';
import { useSync } from '@/hooks';
import { useTheme } from '@/theme';
import type { SyncStatus } from '@/models';
import { Typography } from '../typography';

const LABEL: Record<SyncStatus, string> = {
  IDLE: 'Up to date',
  SYNCING: 'Syncing...',
  SUCCESS: 'Synced',
  FAILED: 'Sync failed',
};

/** Self-contained (reads `useSync()` itself) - a small reusable status chip for any screen. */
export function SyncStatusIndicator() {
  const { theme } = useTheme();
  const { state } = useSync();

  const color =
    state.status === 'FAILED' ? theme.colors.danger : state.status === 'SUCCESS' ? theme.colors.success : theme.colors.textSecondary;
  const Icon = state.status === 'FAILED' ? AlertCircle : state.status === 'SUCCESS' ? Check : RefreshCw;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }} accessibilityLabel={LABEL[state.status]}>
      <Icon size={14} color={color} />
      <Typography variant="caption" style={{ color }}>
        {LABEL[state.status]}
      </Typography>
    </View>
  );
}
