import { memo } from 'react';
import { Card, Typography } from '@/components';
import { useTheme } from '@/hooks';

export interface RemarksCardProps {
  customerRemarks: string | null;
}

function RemarksCardComponent({ customerRemarks }: RemarksCardProps) {
  const { theme } = useTheme();

  return (
    <Card>
      <Typography variant="title">Remarks</Typography>
      <Typography variant="body" color={customerRemarks ? 'text' : 'textSecondary'} style={{ marginTop: theme.spacing.sm }}>
        {customerRemarks ?? 'No customer remarks recorded.'}
      </Typography>
    </Card>
  );
}

export const RemarksCard = memo(RemarksCardComponent);
