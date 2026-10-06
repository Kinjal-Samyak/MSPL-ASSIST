import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Input } from '@/components/ui';
import type { BadgeVariant } from '@/types';
import { PartSearchPicker, SparePartRequestsPanel } from '@/features/tickets/components';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import {
  ticketService,
  type JobCardSparePartItem,
  type PartSearchResult,
  type SparePartRequestItem,
  type SparePartReturnRequestItem,
} from '@/services/ticketService';
import { SparePartReturnRequestsList } from './SparePartReturnRequestsList';

interface PartsWorkspaceProps {
  ticketId: string;
  spareParts: JobCardSparePartItem[];
  editable: boolean;
  onSparePartsChanged: (spareParts: JobCardSparePartItem[]) => void;
}

interface ReconciliationStatus {
  label: string;
  tone: BadgeVariant;
}

function reconciliationStatus(part: JobCardSparePartItem): ReconciliationStatus {
  if (part.requiredQuantity === 0) return { label: 'No Parts Issued', tone: 'neutral' };
  if (part.unreconciledQuantity === 0) return { label: 'Reconciled', tone: 'success' };
  if (part.consumedQuantity === 0 && part.returnedQuantity === 0) {
    return { label: 'Pending Consumption / Return', tone: 'warning' };
  }
  return { label: 'Partially Reconciled', tone: 'warning' };
}

/** The integrated Parts section (Document 8) - a live view of inventory transactions already
 * recorded server-side, never a place to edit inventory directly. Issuing/approving happens via
 * the Service Engineer's spare-part-request workflow; this component only requests, records
 * consumption, and submits (never approves) returns. */
export function PartsWorkspace({
  ticketId,
  spareParts,
  editable,
  onSparePartsChanged,
}: PartsWorkspaceProps) {
  const [partSearchCode, setPartSearchCode] = useState('');
  const [partSearchResults, setPartSearchResults] = useState<PartSearchResult[]>([]);
  const [partSearchLoading, setPartSearchLoading] = useState(false);
  const [requestDraftItems, setRequestDraftItems] = useState<
    Array<{ partId: string; partCode: string; partName: string; quantity: number }>
  >([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [sparePartRequests, setSparePartRequests] = useState<SparePartRequestItem[]>([]);
  const [returnRequests, setReturnRequests] = useState<SparePartReturnRequestItem[]>([]);
  const [consumeDraft, setConsumeDraft] = useState<Record<string, string>>({});
  const [returnDraft, setReturnDraft] = useState<Record<string, string>>({});
  const [busyPartId, setBusyPartId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      const [requests, returns] = await Promise.all([
        ticketService.listSparePartRequests(ticketId),
        ticketService.listSparePartReturnRequests(ticketId),
      ]);
      setSparePartRequests(requests);
      setReturnRequests(returns);
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    }
  }, [ticketId]);

  useEffect(() => {
    void loadRequests();
    setRequestDraftItems([]);
    setConsumeDraft({});
    setReturnDraft({});
  }, [loadRequests]);

  const handleSearchParts = async () => {
    if (!partSearchCode.trim()) return;
    setPartSearchLoading(true);
    setError('');
    try {
      setPartSearchResults(await ticketService.searchParts(partSearchCode.trim()));
    } catch (searchError) {
      setError(toApiErrorMessage(searchError));
    } finally {
      setPartSearchLoading(false);
    }
  };

  const handleAddToRequestDraft = (part: PartSearchResult, quantity: number) => {
    setRequestDraftItems((current) => {
      const nextItem = {
        partId: part.id,
        partCode: part.partCode,
        partName: part.partName,
        quantity,
      };
      const existingIndex = current.findIndex((item) => item.partId === part.id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = nextItem;
        return next;
      }
      return [...current, nextItem];
    });
    setPartSearchCode('');
    setPartSearchResults([]);
    setError('');
  };

  const handleRemoveDraftItem = (partId: string) => {
    setRequestDraftItems((current) => current.filter((item) => item.partId !== partId));
  };

  const handleSubmitSparePartRequest = async () => {
    if (requestDraftItems.length === 0) return;
    setSubmittingRequest(true);
    setError('');
    try {
      await ticketService.requestSpareParts(ticketId, {
        items: requestDraftItems.map((item) => ({
          partId: item.partId,
          requestedQuantity: item.quantity,
        })),
      });
      setRequestDraftItems([]);
      toast.success('Spare part request submitted for Service Engineer approval.');
      await loadRequests();
    } catch (submitError) {
      const message = toApiErrorMessage(submitError);
      setError(message);
      toast.error('Unable to submit request', { description: message });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRecordConsumption = async (part: JobCardSparePartItem) => {
    const raw = consumeDraft[part.partId];
    const quantity = raw === undefined || raw === '' ? part.consumedQuantity : Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('Consumed quantity must be a whole number of 0 or more.');
      return;
    }
    setBusyPartId(part.partId);
    setError('');
    try {
      const updated = await ticketService.recordConsumedQuantity(ticketId, {
        partId: part.partId,
        consumedQuantity: quantity,
      });
      onSparePartsChanged(spareParts.map((row) => (row.partId === part.partId ? updated : row)));
      setConsumeDraft((current) => ({ ...current, [part.partId]: '' }));
      toast.success(`Recorded consumption for ${part.partCode}.`);
    } catch (consumeError) {
      const message = toApiErrorMessage(consumeError);
      setError(message);
      toast.error('Unable to record consumption', { description: message });
    } finally {
      setBusyPartId(null);
    }
  };

  const handleSubmitReturn = async (part: JobCardSparePartItem) => {
    const raw = returnDraft[part.partId] ?? '';
    const quantity = Number(raw);
    if (
      !raw ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > part.remainingReturnable
    ) {
      setError(
        `Enter a whole number between 1 and ${part.remainingReturnable} to submit a return.`
      );
      return;
    }
    setBusyPartId(part.partId);
    setError('');
    try {
      await ticketService.submitSparePartReturnRequest(ticketId, {
        partId: part.partId,
        requestedReturnQuantity: quantity,
      });
      setReturnDraft((current) => ({ ...current, [part.partId]: '' }));
      toast.success(
        `Return request submitted for ${part.partCode} — pending Service Engineer approval.`
      );
      await loadRequests();
    } catch (returnError) {
      const message = toApiErrorMessage(returnError);
      setError(message);
      toast.error('Unable to submit return request', { description: message });
    } finally {
      setBusyPartId(null);
    }
  };

  return (
    <div className="space-y-5">
      {error && <p className="text-xs text-danger">{error}</p>}

      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">
          Issued Parts — Consumption &amp; Returns
        </h4>
        {spareParts.length === 0 ? (
          <p className="text-xs text-slate-400">
            No spare parts have been issued to this job card yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Part</th>
                  <th className="px-3 py-2">Issued Qty</th>
                  <th className="px-3 py-2">Returned Qty</th>
                  <th className="px-3 py-2">Consumed Qty</th>
                  <th className="px-3 py-2">Unit Price</th>
                  <th className="px-3 py-2">Total Price (Consumed)</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {spareParts.map((part) => {
                  const status = reconciliationStatus(part);
                  const busy = busyPartId === part.partId;
                  return (
                    <tr key={part.partId} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{part.partCode}</div>
                        <div className="text-slate-500">{part.partName}</div>
                      </td>
                      <td className="px-3 py-2">{part.requiredQuantity}</td>
                      <td className="px-3 py-2">
                        <div className="text-slate-700">{part.returnedQuantity}</div>
                        {editable && part.remainingReturnable > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <Input
                              aria-label={`Return quantity for ${part.partCode}`}
                              type="number"
                              min={0}
                              max={part.remainingReturnable}
                              value={returnDraft[part.partId] ?? ''}
                              onChange={(event) =>
                                setReturnDraft((current) => ({
                                  ...current,
                                  [part.partId]: event.target.value,
                                }))
                              }
                              placeholder={`Max ${part.remainingReturnable}`}
                              className="h-7 w-20 px-2 py-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              loading={busy}
                              onClick={() => void handleSubmitReturn(part)}
                            >
                              Submit Return
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-slate-700">{part.consumedQuantity}</div>
                        {editable && part.unreconciledQuantity > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <Input
                              aria-label={`Consumed quantity for ${part.partCode}`}
                              type="number"
                              min={0}
                              max={part.requiredQuantity - part.returnedQuantity}
                              value={consumeDraft[part.partId] ?? ''}
                              onChange={(event) =>
                                setConsumeDraft((current) => ({
                                  ...current,
                                  [part.partId]: event.target.value,
                                }))
                              }
                              placeholder={String(part.consumedQuantity)}
                              className="h-7 w-16 px-2 py-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              loading={busy}
                              onClick={() => void handleRecordConsumption(part)}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        ₹{Number(part.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        ₹
                        {Number(part.billableAmount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="px-3 py-2" colSpan={5}>
                    Final Spare Parts Total (Consumed Only)
                  </td>
                  <td className="px-3 py-2" colSpan={2}>
                    ₹
                    {spareParts
                      .reduce((sum, part) => sum + Number(part.billableAmount), 0)
                      .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">
          Return Requests (pending Service Engineer approval)
        </h4>
        <SparePartReturnRequestsList requests={returnRequests} />
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">Request Spare Parts</h4>
        <p className="text-xs text-slate-500">
          Search a part, set the quantity and add it to your request. Submitting sends it to your
          Service Engineer for approval — it only becomes an issued part above once approved.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Part code"
            placeholder="Search by Part Code"
            value={partSearchCode}
            onChange={(event) => setPartSearchCode(event.target.value)}
            disabled={!editable}
          />
          <Button
            size="sm"
            variant="outline"
            loading={partSearchLoading}
            disabled={!editable}
            onClick={() => void handleSearchParts()}
          >
            Search
          </Button>
        </div>
        <PartSearchPicker
          results={partSearchResults}
          buttonLabel="Add to Request"
          onAdd={handleAddToRequestDraft}
        />
        {requestDraftItems.length > 0 && (
          <div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50/50 p-2">
            {requestDraftItems.map((item) => (
              <div
                key={item.partId}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span>
                  {item.partCode} · {item.partName} · Qty {item.quantity}
                </span>
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => handleRemoveDraftItem(item.partId)}
                >
                  Remove
                </button>
              </div>
            ))}
            <Button
              size="sm"
              loading={submittingRequest}
              onClick={() => void handleSubmitSparePartRequest()}
            >
              Submit Request
            </Button>
          </div>
        )}
        <h5 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          My Spare Part Requests
        </h5>
        <SparePartRequestsPanel
          requests={sparePartRequests}
          emptyMessage="You haven't requested any spare parts for this job card yet."
        />
      </section>
    </div>
  );
}
