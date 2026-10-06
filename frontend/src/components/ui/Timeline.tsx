import { cn } from '@/utils';
import { formatDateTime } from '@/utils';
import { EmptyState } from '@/components/feedback';

export interface TimelineEntry {
  id: string;
  title: string;
  description?: string | null;
  timestamp: string;
  actor?: string | null;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface TimelineProps {
  items: TimelineEntry[];
  emptyMessage?: string;
  className?: string;
}

const TONE_DOT: Record<NonNullable<TimelineEntry['tone']>, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function Timeline({
  items,
  emptyMessage = 'No activity recorded yet.',
  className,
}: TimelineProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyMessage} className="py-10" />;
  }

  return (
    <ol className={cn('relative space-y-0', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index !== items.length - 1 && (
            <span
              className="absolute left-[5px] top-3 h-[calc(100%-0.5rem)] w-px bg-border dark:bg-slate-700"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white dark:ring-slate-900',
              TONE_DOT[item.tone ?? 'default']
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800 dark:text-slate-100">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {item.description}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {formatDateTime(item.timestamp)}
              {item.actor ? ` · ${item.actor}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
