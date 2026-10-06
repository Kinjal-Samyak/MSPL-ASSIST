import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search as SearchIcon } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { Modal } from '@/components/layout';
import { toApiErrorMessage } from '@/services/apiService';
import { lookupService, type TechnicianLookupResponse } from '@/services/lookupService';
import {
  workshopWorkbenchService,
  type WorkshopWorkbenchJobCardListItem,
  type WorkshopWorkbenchSummary,
} from '@/services/workshopWorkbenchService';
import { WorkshopDashboard, WorkshopFilters, WorkshopTable } from '../components';
import type { WorkshopWorkbenchFiltersState } from '../components/WorkshopFilters';

const DEFAULT_FILTERS: WorkshopWorkbenchFiltersState = {
  search: '',
  hub: '',
  technicianId: '',
  status: '',
  priority: '',
};

const DEFAULT_SUMMARY: WorkshopWorkbenchSummary = {
  openJobCards: 0,
  openTickets: 0,
  assignedToTechnician: 0,
  inProgress: 0,
  completed: 0,
  readyForDeployment: 0,
  returnedToWorkshop: 0,
};

const PAGE_SIZE = 10;

export function WorkshopPage() {
  const requestIdRef = useRef(0);

  const [filters, setFilters] = useState<WorkshopWorkbenchFiltersState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<WorkshopWorkbenchSummary>(DEFAULT_SUMMARY);
  const [rows, setRows] = useState<WorkshopWorkbenchJobCardListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [technicians, setTechnicians] = useState<TechnicianLookupResponse[]>([]);
  const [viewingJobCard, setViewingJobCard] = useState<WorkshopWorkbenchJobCardListItem | null>(
    null
  );

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    let isCancelled = false;
    lookupService
      .getTechnicians()
      .then((result) => {
        if (!isCancelled) setTechnicians(result);
      })
      .catch(() => {
        if (!isCancelled) setTechnicians([]);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  const hubOptions = useMemo(
    () =>
      Array.from(
        new Set(
          technicians
            .map((technician) => technician.hub)
            .filter((hub): hub is string => Boolean(hub))
        )
      ).sort(),
    [technicians]
  );

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const [summaryData, listData] = await Promise.all([
        workshopWorkbenchService.getSummary(),
        workshopWorkbenchService.listJobCards({
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch.trim() || undefined,
          hub: filters.hub || undefined,
          technicianId: filters.technicianId || undefined,
          status: filters.status || undefined,
          priority: filters.priority || undefined,
        }),
      ]);
      if (requestId !== requestIdRef.current) return;
      setSummary(summaryData);
      setRows(listData.items);
      setTotalRecords(listData.totalRecords);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(toApiErrorMessage(loadError));
      setRows([]);
      setTotalRecords(0);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, filters.hub, filters.priority, filters.status, filters.technicianId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Workshop Workbench
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live oversight of Job Cards created automatically from the Ticket workflow.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      {error !== '' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {error}
        </div>
      )}

      <WorkshopDashboard summary={summary} />

      <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
        <label
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          htmlFor="workshop-quick-search"
        >
          Search by Job Card Number, Ticket Number, or Rider Mobile Number
        </label>
        <Input
          id="workshop-quick-search"
          placeholder="Search by Job Card Number, Ticket Number, or Rider Mobile Number"
          value={filters.search}
          onChange={(event) => {
            setFilters((current) => ({ ...current, search: event.target.value }));
            setPage(1);
          }}
          leftElement={<SearchIcon className="h-4 w-4" />}
        />
      </Card>

      <WorkshopFilters
        filters={filters}
        hubOptions={hubOptions}
        technicianOptions={technicians.map((technician) => ({
          id: technician.technicianId,
          name: technician.technicianName,
        }))}
        onChange={(updates) => {
          setFilters((current) => ({ ...current, ...updates }));
          setPage(1);
        }}
      />

      <WorkshopTable
        rows={rows}
        loading={loading}
        page={page}
        perPage={PAGE_SIZE}
        total={totalRecords}
        onPageChange={setPage}
        onViewJobCard={setViewingJobCard}
      />

      <Modal
        isOpen={viewingJobCard !== null}
        onClose={() => setViewingJobCard(null)}
        title={viewingJobCard?.jobCardNumber}
        size="md"
      >
        {viewingJobCard && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-400">Ticket Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.ticketNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Job Card Status</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.statusLabel}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Ticket Status</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.ticketStatus}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Rider</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.riderName}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Mobile</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.mobileNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Vehicle</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.vehicle ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Hub</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.hub ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Technician</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.technicianName}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Priority</dt>
              <dd className="text-gray-900 dark:text-gray-100">{viewingJobCard.priority}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Updated At</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {new Date(viewingJobCard.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Job Cards are managed inside the Workshop/Technician Workspace. Coordinators have
          read-only visibility here.
        </p>
      </Modal>
    </div>
  );
}
