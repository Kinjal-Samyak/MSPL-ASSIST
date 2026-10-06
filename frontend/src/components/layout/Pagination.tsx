import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ total, page, perPage, onPageChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {start}-{end} of {total} results
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((value, index) =>
          value === '...' ? (
            <span key={`dots-${index}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={value}
              onClick={() => onPageChange(value as number)}
              className={cn(
                'h-8 w-8 rounded text-sm font-medium transition-colors',
                page === value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              {value}
            </button>
          )
        )}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
