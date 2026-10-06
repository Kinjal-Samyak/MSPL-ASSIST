import { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { cn } from '@/utils';
import { toApiErrorMessage } from '@/services/apiService';
import { ticketService, type JobCardDetail } from '@/services/ticketService';
import {
  workshopWorkbenchService,
  type WorkshopWorkbenchJobCardListItem,
} from '@/services/workshopWorkbenchService';
import { ReturnSparePartsDialog } from '@/features/tickets/components';

interface ReturnToInventoryFromJobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Service Engineer fallback for when the Technician forgot to return unused spares at Mark Complete -
 * search for any job card by number/ticket number/mobile, then reuse the same return dialog. */
export function ReturnToInventoryFromJobCardModal({
  isOpen,
  onClose,
}: ReturnToInventoryFromJobCardModalProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<WorkshopWorkbenchJobCardListItem[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WorkshopWorkbenchJobCardListItem | null>(null);
  const [jobCardDetail, setJobCardDetail] = useState<JobCardDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  const reset = () => {
    setQuery('');
    setSearching(false);
    setResults([]);
    setError('');
    setSelected(null);
    setJobCardDetail(null);
    setLoadingDetail(false);
    setShowReturnDialog(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const response = await workshopWorkbenchService.listJobCards({
        page: 1,
        pageSize: 10,
        search: query.trim(),
      });
      setResults(response.items);
    } catch (searchError) {
      setError(toApiErrorMessage(searchError));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (row: WorkshopWorkbenchJobCardListItem) => {
    setSelected(row);
    setLoadingDetail(true);
    setError('');
    try {
      const detail = await ticketService.getJobCardDetail(row.ticketId);
      setJobCardDetail(detail);
      setShowReturnDialog(true);
    } catch (detailError) {
      setError(toApiErrorMessage(detailError));
      setSelected(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showReturnDialog}
        onClose={handleClose}
        title="Return to Inventory from Job Card"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by job card number, ticket number, or mobile"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSearch();
              }}
              className="flex-1"
            />
            <Button
              size="sm"
              leftIcon={<Search className="h-4 w-4" />}
              loading={searching}
              disabled={!query.trim()}
              onClick={() => void handleSearch()}
            >
              Search
            </Button>
          </div>

          {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}

          {results.length > 0 && (
            <ul className="space-y-1">
              {results.map((row) => (
                <li key={row.jobCardId}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(row)}
                    disabled={loadingDetail}
                    className={cn(
                      'w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm transition-colors dark:border-slate-700',
                      selected?.jobCardId === row.jobCardId
                        ? 'bg-blue-50 ring-1 ring-blue-400 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {row.jobCardNumber} · {row.ticketNumber}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.riderName} · {row.mobileNumber} · Technician: {row.technicianName} ·{' '}
                      {row.statusLabel}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ReturnSparePartsDialog
        isOpen={showReturnDialog}
        ticketId={selected?.ticketId ?? null}
        jobCardNumber={jobCardDetail?.jobCardNumber}
        spareParts={jobCardDetail?.spareParts ?? []}
        onClose={() => {
          setShowReturnDialog(false);
          setSelected(null);
          setJobCardDetail(null);
        }}
        onSuccess={handleClose}
      />
    </>
  );
}
