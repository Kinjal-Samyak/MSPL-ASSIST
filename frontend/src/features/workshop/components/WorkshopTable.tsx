import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { Badge, Button } from '@/components/ui';
import type { WorkshopWorkbenchJobCardListItem } from '@/services/workshopWorkbenchService';

interface WorkshopTableProps {
  rows: WorkshopWorkbenchJobCardListItem[];
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onViewJobCard: (row: WorkshopWorkbenchJobCardListItem) => void;
}

const COLUMNS = [
  'Job Card Number',
  'Ticket Number',
  'Rider Name',
  'Mobile Number',
  'Vehicle',
  'Assigned Technician',
  'Current Job Card Status',
  'Current Ticket Status',
  'Priority',
  'Updated At',
  'Actions',
];

function StatusBadge({ status, label }: { status: string; label: string }) {
  if (status === 'COMPLETED') return <Badge variant="success">{label}</Badge>;
  if (status === 'RFD') return <Badge variant="success">{label}</Badge>;
  if (status === 'ASSIGNED') return <Badge variant="warning">{label}</Badge>;
  return <Badge variant="default">{label}</Badge>;
}

export function WorkshopTable({
  rows,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  onViewJobCard,
}: WorkshopTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <div className="py-10">
                    <Loader label="Loading Job Cards..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <EmptyState
                    title="No Job Cards found"
                    description="Try updating the search or filters."
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.jobCardId} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {row.jobCardNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ticketNumber}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.riderName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.mobileNumber}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {row.vehicle ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {row.technicianName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} label={row.statusLabel} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ticketStatus}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.priority}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => onViewJobCard(row)}>
                      View
                    </Button>
                  </td>
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
