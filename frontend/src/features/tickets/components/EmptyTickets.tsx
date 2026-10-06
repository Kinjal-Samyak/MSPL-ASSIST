import { TicketX } from 'lucide-react';
import { EmptyState } from '@/components/feedback';

export function EmptyTickets() {
  return (
    <EmptyState
      icon={<TicketX className="h-10 w-10" />}
      title="No matching tickets"
      description="Try adjusting search terms or filters to find relevant ticket records."
      className="py-14"
    />
  );
}
