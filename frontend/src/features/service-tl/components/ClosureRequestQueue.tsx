import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { ticketService, type TicketClosureRequest } from '@/services/ticketService';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';

interface ClosureRequestQueueProps {
  onDecided?: () => void;
}

const REASON_CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT_CLOSURE: 'Rider closing account',
  VEHICLE_EXCHANGE: 'Vehicle exchange',
  VEHICLE_UPGRADE: 'Vehicle upgrade',
  OTHER: 'Other',
};

export function ClosureRequestQueue({ onDecided }: ClosureRequestQueueProps) {
  const [requests, setRequests] = useState<TicketClosureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRequests(await ticketService.listPendingClosureRequests());
    } catch (caughtError) {
      setError(toApiErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleApprove = async (request: TicketClosureRequest) => {
    setBusyId(request.id);
    try {
      await ticketService.approveClosureRequest(request.id);
      toast.success('Request approved', {
        description: `${request.ticketNumber} ${request.requestType === 'CANCELLATION' ? 'has been cancelled.' : 'has been closed.'}`,
      });
      await load();
      onDecided?.();
    } catch (caughtError) {
      toast.error('Unable to approve request', { description: toApiErrorMessage(caughtError) });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request: TicketClosureRequest) => {
    if (!rejectRemarks.trim()) return;
    setBusyId(request.id);
    try {
      await ticketService.rejectClosureRequest(request.id, rejectRemarks.trim());
      toast.success('Request rejected', { description: `${request.ticketNumber} remains active.` });
      setRejectingId(null);
      setRejectRemarks('');
      await load();
      onDecided?.();
    } catch (caughtError) {
      toast.error('Unable to reject request', { description: toApiErrorMessage(caughtError) });
    } finally {
      setBusyId(null);
    }
  };

  if (!loading && requests.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900/50" padding="md">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning dark:text-amber-400" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">
          Pending Closure Requests {requests.length > 0 ? `(${requests.length})` : ''}
        </h3>
      </div>
      {error !== '' && (
        <p role="alert" className="mt-2 text-sm text-danger dark:text-red-400">
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary dark:text-blue-300">
                    {request.ticketNumber}
                  </span>
                  <Badge variant={request.requestType === 'CANCELLATION' ? 'danger' : 'warning'}>
                    {request.requestType === 'CANCELLATION' ? 'Cancellation' : 'Early Closure'}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {request.requestedByName} · {new Date(request.requestedAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{request.reason}</p>
              {request.requestType === 'EARLY_CLOSURE' && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {REASON_CATEGORY_LABELS[request.reasonCategory ?? 'OTHER']} ·{' '}
                  {request.paymentWaived
                    ? `Payment waived: ${request.paymentWaiveRemarks}`
                    : `${request.paymentMode} · UTR ${request.paymentUtrNumber} · ₹${request.paymentAmount}`}
                </p>
              )}

              {rejectingId === request.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    aria-label="Rejection remarks"
                    placeholder="Required: reason for rejecting this request"
                    value={rejectRemarks}
                    onChange={(event) => setRejectRemarks(event.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectRemarks('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      loading={busyId === request.id}
                      disabled={!rejectRemarks.trim()}
                      onClick={() => void handleReject(request)}
                    >
                      Confirm Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    loading={busyId === request.id}
                    onClick={() => void handleApprove(request)}
                  >
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectingId(request.id)}>
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
