import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { Badge } from '@/components/ui';
import type { CustomerListItem } from '@/services/customerService';
import type { CustomerSortState } from '../types/customer.types';

interface CustomerTableProps {
  rows: CustomerListItem[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: CustomerListItem) => void;
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  sortState: CustomerSortState;
  onSortChange: (sort: CustomerSortState) => void;
}

const SORTABLE_COLUMNS: Array<{ key: CustomerSortState['key']; label: string }> = [
  { key: 'name', label: 'Rider Name' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

function StatusBadge({ status }: { status: CustomerListItem['status'] }) {
  if (status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
  if (status === 'SUSPENDED') return <Badge variant="warning">Suspended</Badge>;
  return <Badge variant="default">Inactive</Badge>;
}

export function CustomerTable({
  rows,
  selectedCustomerId,
  onSelectCustomer,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  sortState,
  onSortChange,
}: CustomerTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
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
                Rider Phone Number
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Active Vehicles
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Open Tickets
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-10">
                    <Loader label="Loading riders..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No matching riders"
                    description="Try updating the search or filters."
                  />
                </td>
              </tr>
            ) : (
              rows.map((customer) => (
                <tr
                  key={customer.customerId}
                  className={`cursor-pointer ${
                    selectedCustomerId === customer.customerId
                      ? 'bg-primary/10 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                  onClick={() => onSelectCustomer(customer)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {customer.customerName}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {customer.createdAt}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {customer.updatedAt}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {customer.registeredMobile}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {customer.activeDeploymentCount}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {customer.openTicketCount}
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
