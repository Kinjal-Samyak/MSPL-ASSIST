import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { Badge } from '@/components/ui';
import type { DeploymentListItem } from '@/services/deploymentService';
import type { DeploymentSortState } from '../types/deployment.types';

interface DeploymentTableProps {
  rows: DeploymentListItem[];
  selectedDeploymentId: string | null;
  onSelectDeployment: (item: DeploymentListItem) => void;
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  sortState: DeploymentSortState;
  onSortChange: (sort: DeploymentSortState) => void;
}

const SORTABLE_COLUMNS: Array<{ key: DeploymentSortState['key']; label: string }> = [
  { key: 'customerName', label: 'Rider' },
  { key: 'vehicleNumber', label: 'Vehicle Number' },
  { key: 'mvTrackNumber', label: 'MV Track' },
  { key: 'rentalStatus', label: 'Status' },
  { key: 'startedAt', label: 'Started At' },
  { key: 'updatedAt', label: 'Updated At' },
];

function StatusBadge({ status }: { status: DeploymentListItem['rentalStatus'] }) {
  if (status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">Pending</Badge>;
  if (status === 'COMPLETED') return <Badge variant="default">Completed</Badge>;
  return <Badge variant="danger">Maintenance</Badge>;
}

export function DeploymentTable({
  rows,
  selectedDeploymentId,
  onSelectDeployment,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  sortState,
  onSortChange,
}: DeploymentTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
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
                Hub
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Model
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="py-10">
                    <Loader label="Loading deployments..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No deployments found"
                    description="Try updating search or filters."
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.deploymentId}
                  className={`cursor-pointer ${
                    selectedDeploymentId === row.deploymentId
                      ? 'bg-primary/10 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                  onClick={() => onSelectDeployment(row)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {row.customerName}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {row.vehicleNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {row.mvTrackNumber}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.rentalStatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.startedAt}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.updatedAt}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.hubName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.modelName}</td>
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
