import { Badge } from '@/components/ui';
import type { TicketStatus } from '@/features/tickets/types/ticket.types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

const STATUS_VARIANT: Record<
  TicketStatus,
  'default' | 'warning' | 'info' | 'success' | 'neutral' | 'danger'
> = {
  OPEN: 'default',
  NEW: 'default',
  ASSIGNED: 'info',
  INSPECTION: 'info',
  IN_PROGRESS: 'warning',
  WAITING_FOR_PARTS: 'warning',
  READY: 'success',
  DELIVERED: 'success',
  ON_HOLD: 'neutral',
  RESOLVED: 'success',
  CLOSED: 'success',
  CANCELLED: 'danger',
};

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
