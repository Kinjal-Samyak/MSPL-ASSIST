import { useOfflineQueue } from '@/hooks';
import { Badge } from './Badge';

/** Self-contained (reads `useOfflineQueue()` itself). Renders nothing when the queue is empty. */
export function PendingQueueBadge() {
  const { pendingCount } = useOfflineQueue();

  if (pendingCount === 0) {
    return null;
  }

  return <Badge label={`${pendingCount} pending`} variant="warning" />;
}
