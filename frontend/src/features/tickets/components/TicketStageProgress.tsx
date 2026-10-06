import { Check } from 'lucide-react';
import { formatDateTime } from '@/utils';
import type { TicketStageProgressItem } from '@/features/tickets/types/ticket.types';
import { TicketSlaStatusBadge } from './TicketSlaStatusBadge';

interface TicketStageProgressProps {
  stages: TicketStageProgressItem[];
}

const STATUS_LABEL: Record<TicketStageProgressItem['status'], string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
};

function StageIcon({
  status,
  notApplicable,
}: {
  status: TicketStageProgressItem['status'];
  notApplicable: boolean;
}) {
  if (notApplicable) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-gray-700">
        N/A
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
    </span>
  );
}

export function TicketStageProgress({ stages }: TicketStageProgressProps) {
  return (
    <ol className="space-y-0">
      {stages.map((stage, index) => (
        <li key={stage.key} className="relative flex gap-3 pb-4 last:pb-0">
          {index !== stages.length - 1 && (
            <span className="absolute left-2.5 top-5 h-full w-px bg-gray-200 dark:bg-gray-700" />
          )}
          <div className="relative z-10 mt-0.5">
            <StageIcon status={stage.status} notApplicable={stage.notApplicable} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stage.label}</p>
              {!stage.notApplicable && stage.slaStatus && (
                <TicketSlaStatusBadge status={stage.slaStatus} />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stage.notApplicable ? 'Not applicable' : STATUS_LABEL[stage.status]}
              {stage.ownerName
                ? ` · ${stage.ownerName}`
                : stage.ownerRole
                  ? ` · ${stage.ownerRole.replace('_', ' ')}`
                  : ''}
              {stage.completedAt
                ? ` · ${formatDateTime(stage.completedAt)}`
                : stage.startedAt
                  ? ` · started ${formatDateTime(stage.startedAt)}`
                  : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
