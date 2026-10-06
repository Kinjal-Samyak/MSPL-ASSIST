import { formatDateTime } from '@/utils';
import type { TicketWorkshopSla } from '@/features/tickets/types/ticket.types';
import { TicketSlaStatusBadge } from './TicketSlaStatusBadge';

interface TicketSlaKpiCardProps {
  workshopSla: TicketWorkshopSla;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(Math.round(Math.abs(ms) / 60000), 0);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function TicketSlaKpiCard({ workshopSla }: TicketSlaKpiCardProps) {
  const startedAt = new Date(workshopSla.startedAt).getTime();
  const dueBy = new Date(workshopSla.dueBy).getTime();
  const referencePoint = workshopSla.completedAt
    ? new Date(workshopSla.completedAt).getTime()
    : Date.now();
  const targetMs = dueBy - startedAt;
  const elapsedMs = referencePoint - startedAt;
  const remainingMs = dueBy - referencePoint;

  return (
    <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Workshop SLA (Primary KPI)
        </h4>
        <TicketSlaStatusBadge status={workshopSla.status} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Elapsed</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {formatDuration(elapsedMs)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Target</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {formatDuration(targetMs)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">
            {remainingMs >= 0 ? 'Remaining' : 'Overdue by'}
          </dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {formatDuration(remainingMs)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Due by {formatDateTime(workshopSla.dueBy)}
        {workshopSla.completedAt ? ` · Completed ${formatDateTime(workshopSla.completedAt)}` : ''}
      </p>
    </section>
  );
}
