import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { Badge } from '@/components/ui';
import type { VehicleListItem } from '@/services/vehicleService';
import type { VehicleSortState } from '../types/vehicle.types';

interface VehicleTableProps {
  rows: VehicleListItem[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicle: VehicleListItem) => void;
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  sortState: VehicleSortState;
  onSortChange: (sort: VehicleSortState) => void;
}

const SORTABLE_COLUMNS: Array<{ key: VehicleSortState['key']; label: string }> = [
  { key: 'vehicleNumber', label: 'Vehicle Number' },
  { key: 'mvTrackNumber', label: 'MV Track' },
  { key: 'hubName', label: 'Hub' },
  { key: 'status', label: 'Status' },
  { key: 'updatedAt', label: 'Updated At' },
];

function StatusBadge({ status }: { status: VehicleListItem['status'] }) {
  if (status === 'DEPLOYED') return <Badge variant="warning">Deployed</Badge>;
  if (status === 'AVAILABLE') return <Badge variant="success">Ready for Deployment</Badge>;
  if (status === 'WORKSHOP' || status === 'MAINTENANCE')
    return <Badge variant="danger">Down</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

export function VehicleTable({
  rows,
  selectedVehicleId,
  onSelectVehicle,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  sortState,
  onSortChange,
}: VehicleTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1024px] text-sm">
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
                Rider
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-10">
                    <Loader label="Loading vehicles..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No fleet assets found"
                    description="Try updating search or filters."
                  />
                </td>
              </tr>
            ) : (
              rows.map((vehicle) => (
                <tr
                  key={vehicle.vehicleId}
                  className={`cursor-pointer ${
                    selectedVehicleId === vehicle.vehicleId
                      ? 'bg-primary/10 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                  onClick={() => onSelectVehicle(vehicle)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {vehicle.vehicleNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {vehicle.mvTrackNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {vehicle.hubName ?? 'NA'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {vehicle.updatedAt}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {vehicle.currentRiderName ?? 'NA'}
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
