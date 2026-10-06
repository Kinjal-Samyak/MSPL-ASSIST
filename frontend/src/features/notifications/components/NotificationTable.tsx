import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { EmptyState, Loader } from '@/components/feedback';
import { Pagination } from '@/components/layout';
import { Badge } from '@/components/ui';
import type { NotificationItem } from '@/services/notificationService';
import type { NotificationSortState } from '../types/notification.types';

interface NotificationTableProps {
  rows: NotificationItem[];
  selectedNotificationId: string | null;
  onSelectNotification: (item: NotificationItem) => void;
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  sortState: NotificationSortState;
  onSortChange: (sort: NotificationSortState) => void;
}

const SORTABLE_COLUMNS: Array<{ key: NotificationSortState['key']; label: string }> = [
  { key: 'createdAt', label: 'Created At' },
  { key: 'eventType', label: 'Event' },
  { key: 'channel', label: 'Channel' },
  { key: 'status', label: 'Status' },
];

function getStatusVariant(
  status: NotificationItem['status']
): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'SENT') return 'success';
  if (status === 'FAILED') return 'danger';
  return 'warning';
}

export function NotificationTable({
  rows,
  selectedNotificationId,
  onSelectNotification,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  sortState,
  onSortChange,
}: NotificationTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              {SORTABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() =>
                      onSortChange({
                        key: column.key,
                        direction:
                          sortState.key === column.key && sortState.direction === 'asc'
                            ? 'desc'
                            : 'asc',
                      })
                    }
                  >
                    <span>{column.label}</span>
                    {sortState.key !== column.key && (
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    )}
                    {sortState.key === column.key && sortState.direction === 'asc' && (
                      <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />
                    )}
                    {sortState.key === column.key && sortState.direction === 'desc' && (
                      <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Recipient
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Message
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-10">
                    <Loader label="Loading notifications..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No notifications found"
                    description="Try changing your search or filters."
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.notificationId}
                  className={`cursor-pointer ${
                    selectedNotificationId === row.notificationId
                      ? 'bg-primary/10 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                  onClick={() => onSelectNotification(row)}
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.createdAt}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.eventType}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.channel}</td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.recipient}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {row.sourceEntityId}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.message}</td>
                </tr>
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
