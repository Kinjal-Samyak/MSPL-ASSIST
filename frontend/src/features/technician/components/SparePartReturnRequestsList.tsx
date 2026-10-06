import { Badge } from '@/components/ui';
import type { BadgeVariant } from '@/types';
import type { SparePartReturnRequestItem } from '@/services/ticketService';
import { formatDateTime } from '@/utils';

const STATUS_VARIANT: Record<SparePartReturnRequestItem['status'], BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

interface SparePartReturnRequestsListProps {
  requests: SparePartReturnRequestItem[];
  emptyMessage?: string;
}

/** Technician-facing, read-only. A Technician can submit a return request but never decide one -
 * see the Return Control Policy (Document 8) - so this never renders approve/reject actions. */
export function SparePartReturnRequestsList({
  requests,
  emptyMessage = "You haven't submitted any return requests for this job card yet.",
}: SparePartReturnRequestsListProps) {
  if (requests.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {requests.map((request) => (
        <li
          key={request.id}
          className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {request.partCode} · {request.partName}
            </span>
            <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
          </div>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Requested return qty {request.requestedReturnQuantity} · by {request.requestedByName} on{' '}
            {formatDateTime(request.requestedAt)}
          </p>
          {request.status !== 'PENDING' && request.decidedByName && (
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {request.decidedByName}
              {request.decidedAt ? ` on ${formatDateTime(request.decidedAt)}` : ''}
              {request.status === 'APPROVED' &&
              request.approvedReturnQuantity != null &&
              request.approvedReturnQuantity !== request.requestedReturnQuantity
                ? ` — approved qty ${request.approvedReturnQuantity} (edited from ${request.requestedReturnQuantity})`
                : ''}
              {request.decisionRemarks ? ` — "${request.decisionRemarks}"` : ''}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
