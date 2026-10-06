import { View } from 'react-native';
import { useSync } from '@/hooks';
import { useTheme } from '@/theme';
import { formatDateTime } from '@/utils';
import { Button } from '../buttons';
import { Card } from '../cards';
import { Typography } from '../typography';
import { PendingQueueBadge } from './PendingQueueBadge';
import { SyncStatusIndicator } from './SyncStatusIndicator';

/** Self-contained (reads `useSync()`/`useOfflineQueue()` via its children). A drop-in Card for
 * Settings or any screen that wants to surface sync state + a manual "Sync Now" action. */
export function LastSyncCard() {
  const { theme } = useTheme();
  const { state, sync, isSyncing } = useSync();

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="title">Sync Status</Typography>
        <SyncStatusIndicator />
      </View>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.xs }}>
        <Typography variant="caption" color="textSecondary">
          {state.lastSyncedAt ? `Last synced ${formatDateTime(state.lastSyncedAt)}` : 'Not synced yet'}
        </Typography>
        {state.lastError ? (
          <Typography variant="caption" color="danger">
            {state.lastError}
          </Typography>
        ) : null}
      </View>

      <View style={{ marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PendingQueueBadge />
        <Button label="Sync Now" size="sm" variant="outline" onPress={sync} loading={isSyncing} accessibilityLabel="Sync now" />
      </View>
    </Card>
  );
}
