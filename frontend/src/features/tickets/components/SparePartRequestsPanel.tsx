import { useState } from 'react';
import { Check, CheckCheck, RotateCcw, X } from 'lucide-react';
import { Badge, Button, Input, Textarea } from '@/components/ui';
import type { BadgeVariant } from '@/types';
import type { SparePartRequestItem } from '@/services/ticketService';
import { formatDateTime } from '@/utils';

const STATUS_VARIANT: Record<SparePartRequestItem['status'], BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVERSED: 'neutral',
};

interface SparePartRequestsPanelProps {
  requests: SparePartRequestItem[];
  emptyMessage?: string;
  /** Only Service Engineer/Admin get these - omit for a Technician's read-only view of their own requests. */
  onApprove?: (requestId: string, approvedQuantity: number) => void;
  onReject?: (requestId: string, remarks: string) => void;
  onReverse?: (requestId: string, remarks: string) => void;
  /** Bulk-approves every PENDING request, using each row's current (possibly edited) quantity. */
  onApproveAll?: (items: Array<{ requestId: string; approvedQuantity: number }>) => void;
  busyRequestId?: string | null;
  approveAllBusy?: boolean;
  /** Per-request failure reasons from the most recent Approve All call (e.g. insufficient stock). */
  approvalFailures?: Record<string, string>;
}

export function SparePartRequestsPanel({
  requests,
  emptyMessage = 'No spare part requests yet.',
  onApprove,
  onReject,
  onReverse,
  onApproveAll,
  busyRequestId = null,
  approveAllBusy = false,
  approvalFailures,
}: SparePartRequestsPanelProps) {
  const [remarksModeId, setRemarksModeId] = useState<{
    id: string;
    kind: 'REJECT' | 'REVERSE';
  } | null>(null);
  const [remarksValue, setRemarksValue] = useState('');
  const [quantityByRequestId, setQuantityByRequestId] = useState<Record<string, number>>({});

  const canDecide = Boolean(onApprove && onReject);
  const startRemarks = (id: string, kind: 'REJECT' | 'REVERSE') => {
    setRemarksModeId({ id, kind });
    setRemarksValue('');
  };
  const cancelRemarks = () => {
    setRemarksModeId(null);
    setRemarksValue('');
  };
  const submitRemarks = () => {
    if (!remarksModeId || !remarksValue.trim()) return;
    if (remarksModeId.kind === 'REJECT') onReject?.(remarksModeId.id, remarksValue.trim());
    else onReverse?.(remarksModeId.id, remarksValue.trim());
    cancelRemarks();
  };

  const quantityFor = (request: SparePartRequestItem) =>
    quantityByRequestId[request.id] ?? request.requestedQuantity;

  const pendingRequests = requests.filter((request) => request.status === 'PENDING');

  const handleApproveAll = () => {
    if (!onApproveAll || pendingRequests.length === 0) return;
    onApproveAll(
      pendingRequests.map((request) => ({
        requestId: request.id,
        approvedQuantity: quantityFor(request),
      }))
    );
  };

  if (requests.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {canDecide && onApproveAll && pendingRequests.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            loading={approveAllBusy}
            onClick={handleApproveAll}
          >
            Approve All ({pendingRequests.length})
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {requests.map((request) => {
          const busy = busyRequestId === request.id;
          const inRemarksMode = remarksModeId?.id === request.id;
          const failureReason = approvalFailures?.[request.id];

          return (
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
                Qty {request.requestedQuantity} · requested by {request.requestedByName} on{' '}
                {formatDateTime(request.requestedAt)}
              </p>
              {request.status !== 'PENDING' && request.decidedByName && (
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  {/* REVERSED requests were originally APPROVED - decidedByName/decidedAt always reflect that original approval, never a rejection. */}
                  {request.status === 'REJECTED' ? 'Rejected' : 'Approved'} by{' '}
                  {request.decidedByName}
                  {request.decidedAt ? ` on ${formatDateTime(request.decidedAt)}` : ''}
                  {request.status === 'APPROVED' &&
                  request.approvedQuantity != null &&
                  request.approvedQuantity !== request.requestedQuantity
                    ? ` — approved qty ${request.approvedQuantity} (edited from ${request.requestedQuantity})`
                    : ''}
                  {request.decisionRemarks ? ` — "${request.decisionRemarks}"` : ''}
                </p>
              )}
              {request.status === 'REVERSED' && request.reversedByName && (
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Reversed by {request.reversedByName}
                  {request.reversedAt ? ` on ${formatDateTime(request.reversedAt)}` : ''}
                  {request.reversalRemarks ? ` — "${request.reversalRemarks}"` : ''}
                </p>
              )}
              {failureReason && (
                <p className="mt-1 text-danger dark:text-red-400">{failureReason}</p>
              )}

              {canDecide && request.status === 'PENDING' && (
                <div className="mt-2">
                  {inRemarksMode ? (
                    <div className="space-y-2">
                      <Textarea
                        aria-label="Rejection reason"
                        placeholder="Required: reason for rejecting this request"
                        value={remarksValue}
                        onChange={(event) => setRemarksValue(event.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelRemarks}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!remarksValue.trim()}
                          onClick={submitRemarks}
                        >
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        Qty to approve
                        <Input
                          type="number"
                          min={1}
                          max={request.availableQuantity}
                          value={quantityFor(request)}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            setQuantityByRequestId((prev) => ({
                              ...prev,
                              [request.id]: Number.isFinite(parsed)
                                ? parsed
                                : request.requestedQuantity,
                            }));
                          }}
                          className="h-7 w-16 px-2 py-1"
                        />
                      </label>
                      <Button
                        size="sm"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        loading={busy}
                        disabled={
                          quantityFor(request) < 1 ||
                          quantityFor(request) > request.availableQuantity
                        }
                        onClick={() => onApprove?.(request.id, quantityFor(request))}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<X className="h-3.5 w-3.5" />}
                        disabled={busy}
                        onClick={() => startRemarks(request.id, 'REJECT')}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {onReverse && request.status === 'APPROVED' && (
                <div className="mt-2">
                  {inRemarksMode ? (
                    <div className="space-y-2">
                      <Textarea
                        aria-label="Reversal reason"
                        placeholder="Required: reason for reversing this approved request"
                        value={remarksValue}
                        onChange={(event) => setRemarksValue(event.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelRemarks}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!remarksValue.trim()}
                          onClick={submitRemarks}
                        >
                          Confirm Reverse
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => startRemarks(request.id, 'REVERSE')}
                    >
                      Reverse (return to stock)
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
