import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Badge, Card, Input, Select } from '@/components/ui';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { toApiErrorMessage } from '@/services/apiService';
import {
  ticketService,
  type SparePartRequestItem,
  type SparePartRequestStatus,
} from '@/services/ticketService';

const PAGE_SIZE = 20;

const COLUMNS = [
  'Part Code',
  'Part Name',
  'Job Card No.',
  'Requested Qty',
  'Approved Qty',
  'Returned Qty',
  'Requested By',
  'Approved By',
  'Requisition Date & Time',
  'Status',
];

const STATUS_OPTIONS: Array<{ value: SparePartRequestStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REVERSED', label: 'Reversed' },
];

const STATUS_BADGE_VARIANT: Record<
  SparePartRequestStatus,
  'success' | 'danger' | 'info' | 'warning'
> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVERSED: 'info',
};

/**
 * Cross-job-card rollup of Technician spare-part requests (JobCardSparePartRequest) - the same
 * requests visible one job card at a time inside each Job Card's Parts section, surfaced here as
 * the single place to see every requisition across every job card. Read-only: approving/rejecting
 * an individual request still happens from that request's own Job Card, where the context (job,
 * customer, technician) is right there - this page is for visibility, not action.
 */
export function PartRequisitionsPage() {
  const [status, setStatus] = useState<SparePartRequestStatus | ''>('');
  const [partCodeInput, setPartCodeInput] = useState('');
  const [partCode, setPartCode] = useState('');
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<SparePartRequestItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setPartCode(partCodeInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [partCodeInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ticketService.listAllSparePartRequests({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        partCode: partCode || undefined,
      });
      setRequests(result.items);
      setTotalRecords(result.totalRecords);
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, status, partCode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Inventory</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Part Requisitions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Every Technician spare-part request across every Job Card, in one place. Approve, reject,
          or return parts from the request&apos;s own Job Card.
        </p>
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
          <h2 className="text-sm font-semibold text-slate-900">Requisitions</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={partCodeInput}
              onChange={(event) => {
                setPartCodeInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search Part Code..."
              leftElement={<Search className="h-4 w-4" />}
              className="w-56"
            />
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as SparePartRequestStatus | '');
                setPage(1);
              }}
              placeholder="All statuses"
              options={STATUS_OPTIONS}
              className="w-48"
            />
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {COLUMNS.map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    <div className="py-10">
                      <Loader label="Loading requisitions..." />
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    <EmptyState
                      icon={<ClipboardList className="h-8 w-8" />}
                      title="No requisitions found"
                      description="Try widening the filters."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-900">{request.partCode}</td>
                    <td className="px-4 py-3 text-slate-700">{request.partName}</td>
                    <td className="px-4 py-3 text-slate-700">{request.jobCardNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{request.requestedQuantity}</td>
                    <td className="px-4 py-3 text-slate-700">{request.approvedQuantity ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {request.status === 'REVERSED' ? request.requestedQuantity : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{request.requestedByName}</td>
                    <td className="px-4 py-3 text-slate-700">{request.decidedByName ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {new Date(request.requestedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{request.status}</Badge>
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
    </div>
  );
}
