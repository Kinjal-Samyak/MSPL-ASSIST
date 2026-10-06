import { Badge } from '@/components/ui';
import type { TicketPriority } from '@/features/tickets/types/ticket.types';

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
}

const PRIORITY_VARIANT: Record<TicketPriority, 'danger' | 'warning' | 'info' | 'neutral'> = {
  P1: 'danger',
  P2: 'warning',
  P3: 'info',
  P4: 'neutral',
};

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}
