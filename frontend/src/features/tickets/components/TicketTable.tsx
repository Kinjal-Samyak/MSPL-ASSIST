import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { Pagination } from '@/components/layout';
import type { Ticket } from '@/features/tickets/types/ticket.types';
import { EmptyTickets } from './EmptyTickets';
import { LoadingTickets } from './LoadingTickets';
import { TicketRow } from './TicketRow';

type SortKey =
  | 'ticketNumber'
  | 'customer'
  | 'phone'
  | 'vehicle'
  | 'model'
  | 'hub'
  | 'category'
  | 'priority'
  | 'status'
  | 'assignedTechnician'
  | 'createdAt';

interface SortState {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface TicketTableProps {
  rows: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticket: Ticket) => void;
  loading: boolean;
  sortState: SortState;
  onSortChange: (sortState: SortState) => void;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

const SORTABLE_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'ticketNumber', label: 'Ticket Number' },
  { key: 'customer', label: 'Rider' },
  { key: 'phone', label: 'Phone' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'model', label: 'Model' },
  { key: 'hub', label: 'Hub' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTechnician', label: 'Assigned Technician' },
  { key: 'createdAt', label: 'Created Date' },
];

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button type="button" className="inline-flex items-center gap-1" onClick={onClick}>
      <span>{label}</span>
      {!active && <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />}
      {active && direction === 'asc' && <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />}
      {active && direction === 'desc' && <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

export function TicketTable({
  rows,
  selectedTicketId,
  onSelectTicket,
  loading,
  sortState,
  onSortChange,
  page,
  perPage,
  total,
  onPageChange,
}: TicketTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1820px] text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              {SORTABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  <SortButton
                    label={column.label}
                    active={sortState.key === column.key}
                    direction={sortState.direction}
                    onClick={() =>
                      onSortChange({
                        key: column.key,
                        direction:
                          sortState.key === column.key && sortState.direction === 'asc'
                            ? 'desc'
                            : 'asc',
                      })
                    }
                  />
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                MV Track No
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Job Card No
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Job Card Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Current Stage
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                SLA Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Owner
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={17}>
                  <LoadingTickets />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={17}>
                  <EmptyTickets />
                </td>
              </tr>
            ) : (
              rows.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedTicketId === ticket.id}
                  onSelect={onSelectTicket}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <Pagination total={total} page={page} perPage={perPage} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
