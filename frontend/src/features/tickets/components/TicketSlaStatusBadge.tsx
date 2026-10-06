import { Badge } from '@/components/ui';
import type { SlaStatusValue } from '@/features/tickets/types/ticket.types';

interface TicketSlaStatusBadgeProps {
  status: SlaStatusValue;
}

const SLA_STATUS_VARIANT: Record<
  SlaStatusValue,
  'default' | 'warning' | 'info' | 'success' | 'neutral' | 'danger'
> = {
  ON_TRACK: 'info',
  AT_RISK: 'warning',
  DELAYED: 'danger',
  COMPLETED: 'success',
  COMPLETED_LATE: 'warning',
};

const SLA_STATUS_LABEL: Record<SlaStatusValue, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  COMPLETED_LATE: 'Completed Late',
};

export function TicketSlaStatusBadge({ status }: TicketSlaStatusBadgeProps) {
  return <Badge variant={SLA_STATUS_VARIANT[status]}>{SLA_STATUS_LABEL[status]}</Badge>;
}
