import { cn } from '@/utils';
import type { ActivityStatus } from '@/features/dashboard/types';

interface StatusBadgeProps {
  status: ActivityStatus;
}

const STATUS_STYLES: Record<ActivityStatus, string> = {
  CREATED: 'bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-300',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  IN_PROGRESS: 'bg-warning/10 text-warning dark:bg-amber-900/30 dark:text-amber-300',
  RESOLVED: 'bg-success/10 text-success dark:bg-emerald-900/30 dark:text-emerald-300',
  SLA_BREACHED: 'bg-danger/10 text-danger dark:bg-rose-900/30 dark:text-rose-300',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        STATUS_STYLES[status]
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
