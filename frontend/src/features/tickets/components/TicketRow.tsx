import { formatDate, formatDateTime } from '@/utils';
import type { Ticket } from '@/features/tickets/types/ticket.types';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketSlaStatusBadge } from './TicketSlaStatusBadge';

interface TicketRowProps {
  ticket: Ticket;
  isSelected: boolean;
  onSelect: (ticket: Ticket) => void;
}

function formatOwnerLabel(ticket: Ticket): string {
  const roleLabel = ticket.owner.role.replace('_', ' ');
  return ticket.owner.name ? `${roleLabel} · ${ticket.owner.name}` : roleLabel;
}

function CurrentStageDot({ status }: { status: Ticket['currentStage']['status'] }) {
  if (status === 'COMPLETED') {
    return <span className="inline-block h-2 w-2 rounded-full bg-green-500" />;
  }
  if (status === 'IN_PROGRESS') {
    return <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />;
  }
  return <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />;
}

export function TicketRow({ ticket, isSelected, onSelect }: TicketRowProps) {
  return (
    <tr
      onClick={() => onSelect(ticket)}
      className={`cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800 ${
        isSelected
          ? 'bg-blue-50/70 dark:bg-blue-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-primary dark:text-blue-300">
        {ticket.ticketNumber}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
        {ticket.customer}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.phone}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
        {ticket.vehicle}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.model}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.hub}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.category}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <TicketPriorityBadge priority={ticket.priority} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <TicketStatusBadge status={ticket.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.assignedTechnician}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {formatDate(ticket.createdAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.batteryNumber || '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.jobCardNumber || '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {ticket.jobCardEffectiveStatusLabel || '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <CurrentStageDot status={ticket.currentStage.status} />
          {ticket.currentStage.label}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <TicketSlaStatusBadge status={ticket.slaStatus.status} />
        {ticket.slaStatus.dueBy && (
          <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
            {formatDateTime(ticket.slaStatus.dueBy)}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {formatOwnerLabel(ticket)}
      </td>
    </tr>
  );
}
