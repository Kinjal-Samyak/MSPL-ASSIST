import { memo } from 'react';
import { Card, Typography } from '@/components';
import { useTheme } from '@/hooks';

export interface CoordinatorNotesCardProps {
  notes: string | null;
}

function CoordinatorNotesCardComponent({ notes }: CoordinatorNotesCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <Typography variant="title">Coordinator Notes</Typography>
      <Typography variant="body" color={notes ? 'text' : 'textSecondary'} style={{ marginTop: theme.spacing.sm }}>
        {notes ?? 'No coordinator notes recorded.'}
      </Typography>
    </Card>
  );
}

export const CoordinatorNotesCard = memo(CoordinatorNotesCardComponent);
