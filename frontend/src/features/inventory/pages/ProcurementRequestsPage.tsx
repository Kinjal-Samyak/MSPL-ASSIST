import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardList, Plus, X } from 'lucide-react';
import { Badge, Button, Card, Select } from '@/components/ui';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import {
  procurementService,
  type ProcurementRequest,
  type ProcurementRequestStatus,
} from '@/services/procurementService';
import { CreateProcurementRequestModal } from '@/features/inventory/components/CreateProcurementRequestModal';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: ProcurementRequestStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CONVERTED_TO_PO', label: 'Converted to PO' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_BADGE_VARIANT: Record<
  ProcurementRequestStatus,
  'success' | 'danger' | 'info' | 'warning' | 'neutral'
> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CONVERTED_TO_PO: 'info',
  CLOSED: 'neutral',
};

export function ProcurementRequestsPage() {
  const [status, setStatus] = useState<ProcurementRequestStatus | ''>('');
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await procurementService.listProcurementRequests({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
      });
      setRequests(result.items);
      setTotalRecords(result.totalRecords);
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setDecidingId(id);
    try {
      const updated =
        decision === 'approve'
          ? await procurementService.approveProcurementRequest(id)
          : await procurementService.rejectProcurementRequest(id);
      setRequests((prev) => prev.map((row) => (row.id === id ? updated : row)));
      toast.success(decision === 'approve' ? 'Request approved.' : 'Request rejected.');
    } catch (decideError) {
      toast.error('Unable to decide request', { description: toApiErrorMessage(decideError) });
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Inventory &middot; Procurement
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Procurement Requests</h1>
          <p className="mt-2 text-sm text-slate-600">
            Restock requests, raised manually or from a Job Card&apos;s Parts timeline when stock
            falls short. Approving does not move stock - it only clears the way for a Purchase
            Order.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Raise Request
        </Button>
      </header>

      {error !== '' && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Requests</h2>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ProcurementRequestStatus | '');
              setPage(1);
            }}
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            className="w-48"
          />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {[
                  'Request #',
                  'Part',
                  'Qty',
                  'Reason',
                  'Job Card',
                  'Requested By',
                  'Status',
                  'Raised',
                  '',
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="py-10">
                      <Loader label="Loading requests..." />
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<ClipboardList className="h-8 w-8" />}
                      title="No procurement requests found"
                      description="Try widening the filters, or raise a new request."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {request.requestNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {request.partCode} - {request.partName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{request.requestedQuantity}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {request.reason.replaceAll('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{request.jobCardNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{request.requestedByName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[request.status]}>
                        {request.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'PENDING' && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Check className="h-3.5 w-3.5" />}
                            onClick={() => void decide(request.id, 'approve')}
                            loading={decidingId === request.id}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<X className="h-3.5 w-3.5" />}
                            onClick={() => void decide(request.id, 'reject')}
                            loading={decidingId === request.id}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination total={totalRecords} page={page} perPage={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </Card>

      <CreateProcurementRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(request) => setRequests((prev) => [request, ...prev])}
      />
    </div>
  );
}
