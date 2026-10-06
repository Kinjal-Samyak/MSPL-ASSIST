import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { EmptyState } from '@/components/feedback';
import { Pagination } from '@/components/layout';
import { Input } from '@/components/ui';
import type { SortState, TableColumn } from '@/types';
import { cn } from '@/utils';

interface TableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  className?: string;
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
}

function SortIcon({ column, sort }: { column: string; sort: SortState }) {
  if (sort.column !== column) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
  if (sort.direction === 'asc') return <ChevronUp className="h-3.5 w-3.5 text-primary" />;
  return <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-800">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No data found',
  emptyDescription,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  pageSize = 25,
  className,
  rowKey,
  onRowClick,
  stickyHeader = false,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>({ column: '', direction: null });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const query = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? '')
          .toLowerCase()
          .includes(query)
      )
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort.column || !sort.direction) return filtered;
    return [...filtered].sort((a, b) => {
      const left = a[sort.column as keyof T];
      const right = b[sort.column as keyof T];
      const result = String(left ?? '') < String(right ?? '') ? -1 : 1;
      return sort.direction === 'asc' ? result : -result;
    });
  }, [filtered, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  function handleSort(key: string) {
    setSort((previous) => ({
      column: key,
      direction:
        previous.column === key
          ? previous.direction === 'asc'
            ? 'desc'
            : previous.direction === 'desc'
              ? null
              : 'asc'
          : 'asc',
    }));
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {searchable && (
        <div className="w-64">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <table className="mspl-table w-full">
          <thead
            className={cn(
              'border-b border-border bg-background dark:border-slate-800 dark:bg-slate-900/70',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-left text-[13px] font-semibold uppercase leading-5 tracking-[0.08em] text-gray-500 dark:text-gray-400',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable &&
                      'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable && <SortIcon column={String(column.key)} sort={sort} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface dark:divide-slate-800 dark:bg-slate-900">
            {loading ? (
              <TableSkeleton rows={5} cols={columns.length} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} className="py-12" />
                </td>
              </tr>
            ) : (
              paginated.map((row, index) => (
                <tr
                  key={String(row[rowKey])}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    index % 2 === 1 && 'bg-background/60 dark:bg-transparent',
                    onRowClick && 'cursor-pointer hover:bg-primary/5 dark:hover:bg-slate-800/50'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-sm font-normal leading-5 text-gray-900 dark:text-gray-100',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key as keyof T], row)
                        : String(row[column.key as keyof T] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && sorted.length > pageSize && (
        <Pagination total={sorted.length} page={page} perPage={pageSize} onPageChange={setPage} />
      )}
    </div>
  );
}
