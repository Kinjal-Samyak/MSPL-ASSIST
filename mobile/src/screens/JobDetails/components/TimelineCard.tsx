import { memo, useMemo } from 'react';
import { Card, Timeline, Typography } from '@/components';
import { formatDateTime } from '@/utils';
import type { JobTimelineEntry } from '@/models';

export interface TimelineCardProps {
  entries: JobTimelineEntry[];
}

function TimelineCardComponent({ entries }: TimelineCardProps) {
  const items = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        title: entry.description,
        description: entry.performedByName ? `By ${entry.performedByName}` : undefined,
        timestamp: formatDateTime(entry.performedAt),
      })),
    [entries]
  );

  return (
    <Card>
      <Typography variant="title" style={{ marginBottom: 16 }}>
        Timeline
      </Typography>
      <Timeline items={items} emptyLabel="No history recorded yet." />
    </Card>
  );
}

export const TimelineCard = memo(TimelineCardComponent);
