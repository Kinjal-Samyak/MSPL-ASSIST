import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { cn } from '@/utils';
import { Input } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { Pagination } from '@/components/layout';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  accessor?: (row: T) => string | number | null | undefined;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  className?: string;
}

export interface DataTableSortState {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Controlled search - parent owns the value (e.g. to debounce a server call). Omit to hide the search box. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Controlled sort - parent handles re-fetching/re-sorting. If omitted, DataTable sorts `rows` client-side using each column's `accessor`. */
  sort?: DataTableSortState | null;
  onSortChange?: (sort: DataTableSortState) => void;
  filterChips?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
  skeletonRowCount?: number;
}

function toggleDirection(current: SortDirection): SortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  selectedRowKey,
  emptyTitle = 'No records found',
  emptyDescription,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  sort,
  onSortChange,
  filterChips,
  toolbarRight,
  pagination,
  className,
  skeletonRowCount = 5,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<DataTableSortState | null>(null);
  const isControlledSort = sort !== undefined;
  const activeSort = isControlledSort ? sort : internalSort;

  const handleSortClick = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;
    const nextDirection: SortDirection =
      activeSort?.key === column.key ? toggleDirection(activeSort.direction) : 'asc';
    const next = { key: column.key, direction: nextDirection };
    if (onSortChange) {
      onSortChange(next);
    }
    if (!isControlledSort) {
      setInternalSort(next);
    }
  };

  const displayedRows = useMemo(() => {
    if (isControlledSort || !activeSort) return rows;
    const column = columns.find((item) => item.key === activeSort.key);
    if (!column?.accessor) return rows;
    const sorted = [...rows].sort((a, b) => {
      const left = column.accessor?.(a) ?? '';
      const right = column.accessor?.(b) ?? '';
      if (left === right) return 0;
      const result = left > right ? 1 : -1;
      return activeSort.direction === 'asc' ? result : -result;
    });
    return sorted;
  }, [rows, activeSort, columns, isControlledSort]);

  const showToolbar = onSearchChange !== undefined || filterChips || toolbarRight;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      {showToolbar && (
        <div className="flex flex-col gap-3 border-b border-border p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {onSearchChange !== undefined ? (
              <Input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
                leftElement={<Search className="h-4 w-4" />}
                className="sm:w-72"
              />
            ) : (
              <span />
            )}
            {toolbarRight}
          </div>
          {filterChips && <div className="flex flex-wrap gap-2">{filterChips}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="mspl-table w-full min-w-full">
          <thead className="sticky top-0 z-10 border-b border-border bg-background dark:border-slate-800 dark:bg-slate-900/95">
            <tr>
              {columns.map((column) => {
                const isActive = activeSort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(column)}
                        className="inline-flex items-center gap-1 rounded transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:text-slate-200"
                      >
                        <span>{column.header}</span>
                        {isActive ? (
                          activeSort?.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary dark:text-blue-400" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary dark:text-blue-400" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-slate-800">
            {loading ? (
              Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              displayedRows.map((row, index) => {
                const key = rowKey(row);
                const selected = selectedRowKey === key;
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'transition-colors duration-150 motion-reduce:transition-none',
                      index % 2 === 1 && !selected && 'bg-background/60 dark:bg-transparent',
                      onRowClick &&
                        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                      selected
                        ? 'bg-primary/10 dark:bg-blue-900/20'
                        : onRowClick
                          ? 'hover:bg-primary/5 dark:hover:bg-slate-800/40'
                          : ''
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200',
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                              ? 'text-center'
                              : 'text-left',
                          column.className
                        )}
                      >
                        {column.render ? column.render(row) : String(column.accessor?.(row) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}
