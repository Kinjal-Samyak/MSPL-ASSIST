import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coins,
  MessageSquareText,
  PackageSearch,
  Settings,
  ShieldCheck,
  Ticket,
  Truck,
  UserCheck,
  XCircle,
  Paperclip,
} from 'lucide-react';
import { formatDateTime } from '@/utils';
import type { TicketTimelineEvent } from '@/features/tickets/types/ticket.types';

interface TicketTimelineProps {
  events: TicketTimelineEvent[];
}

const ICON_MAP = {
  TICKET_CREATED: Ticket,
  ASSIGNED: UserCheck,
  INSPECTION: ClipboardCheck,
  REPAIR: Settings,
  PARTS: PackageSearch,
  ETA: Clock3,
  CHARGES: Coins,
  COMMENT: MessageSquareText,
  ATTACHMENT: Paperclip,
  COMPLETED: CheckCircle2,
  DELIVERED: Truck,
  CLOSED: ShieldCheck,
  CANCELLED: XCircle,
} as const;

export function TicketTimeline({ events }: TicketTimelineProps) {
  const sortedEvents = [...events].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  );

  return (
    <ul className="space-y-2">
      {sortedEvents.map((event) => {
        const Icon = ICON_MAP[event.icon];
        return (
          <li key={event.id} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(event.timestamp)}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {event.title}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{event.description}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
