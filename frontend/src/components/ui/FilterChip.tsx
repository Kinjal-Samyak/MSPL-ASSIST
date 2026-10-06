import type React from 'react';
import { cn } from '@/utils';

interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number | string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function FilterChip({
  label,
  active = false,
  count,
  onClick,
  icon,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none',
        active
          ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
        className
      )}
    >
      {icon && <span className="h-3.5 w-3.5">{icon}</span>}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
            active
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
