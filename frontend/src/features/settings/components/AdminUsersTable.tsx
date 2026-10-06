import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { Badge } from '@/components/ui';
import type { AdminUser } from '@/services/adminService';
import type { AdminUserSortState } from '../types/admin.types';

interface AdminUsersTableProps {
  rows: AdminUser[];
  selectedUserId: string | null;
  onSelectUser: (item: AdminUser) => void;
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  sortState: AdminUserSortState;
  onSortChange: (sort: AdminUserSortState) => void;
}

const SORTABLE_COLUMNS: Array<{ key: AdminUserSortState['key']; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'updatedAt', label: 'Updated At' },
];

export function AdminUsersTable({
  rows,
  selectedUserId,
  onSelectUser,
  loading,
  page,
  perPage,
  total,
  onPageChange,
  sortState,
  onSortChange,
}: AdminUsersTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
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
                Mobile
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Hubs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-10">
                    <Loader label="Loading users..." />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No users found"
                    description="Try updating search or filters."
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.userId}
                  className={`cursor-pointer ${
                    selectedUserId === row.userId
                      ? 'bg-primary/10 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                  onClick={() => onSelectUser(row)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.email}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.role}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.updatedAt}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.mobile}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.active ? 'success' : 'danger'}>
                      {row.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {row.hubs.join(', ')}
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
