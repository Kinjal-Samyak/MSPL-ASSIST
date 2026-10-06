import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { TicketFilters, TicketPreview, TicketTable } from '@/features/tickets/components';
import {
  mapSortToBackend,
  mapTicketDetailToTicket,
  mapTicketListItemToTicket,
} from '@/features/tickets/types/ticket.api';
import type { Ticket, TicketFiltersState } from '@/features/tickets/types/ticket.types';
import { toApiErrorMessage } from '@/services/apiService';
import { ticketService } from '@/services/ticketService';
import { ClosureRequestQueue } from '../components/ClosureRequestQueue';
import { JobCardsList } from '../components/JobCardsList';
import { ReturnToInventoryFromJobCardModal } from '../components/ReturnToInventoryFromJobCardModal';

interface SortState {
  key:
    | 'ticketNumber'
    | 'customer'
    | 'phone'
    | 'vehicle'
    | 'model'
    | 'hub'
    | 'category'
    | 'priority'
    | 'status'
    | 'assignedTechnician'
    | 'createdAt';
  direction: 'asc' | 'desc';
}

type WorkbenchView = 'TICKETS' | 'JOB_CARDS';

const DEFAULT_SORT: SortState = { key: 'createdAt', direction: 'desc' };
const PAGE_SIZE = 12;

const DEFAULT_FILTERS: TicketFiltersState = {
  search: '',
  hub: '',
  priority: '',
  status: '',
  category: '',
  technician: '',
  vehicleModel: '',
  vehicleType: '',
  startDate: '',
  endDate: '',
};

const DEFAULT_FILTER_OPTIONS = {
  hubs: [] as string[],
  priorities: ['P1', 'P2', 'P3', 'P4'] as Array<'P1' | 'P2' | 'P3' | 'P4'>,
  statuses: [
    'OPEN',
    'ASSIGNED',
    'INSPECTION',
    'IN_PROGRESS',
    'WAITING_FOR_PARTS',
    'READY',
    'DELIVERED',
    'CLOSED',
    'CANCELLED',
  ] as Array<
    | 'OPEN'
    | 'ASSIGNED'
    | 'INSPECTION'
    | 'IN_PROGRESS'
    | 'WAITING_FOR_PARTS'
    | 'READY'
    | 'DELIVERED'
    | 'CLOSED'
    | 'CANCELLED'
  >,
  categories: [] as string[],
  technicians: [] as string[],
  vehicleModels: [] as string[],
};

export function ServiceTlWorkspacePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<TicketFiltersState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [view, setView] = useState<WorkbenchView>('TICKETS');
  const [openOnly, setOpenOnly] = useState(false);
  const [showReturnToInventoryModal, setShowReturnToInventoryModal] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    const detail = await ticketService.getMyServiceTlTicketById(ticketId);
    const mapped = mapTicketDetailToTicket(detail);
    setSelectedTicket(mapped);
    return mapped;
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingList(true);
    setErrorMessage('');

    try {
      const response = await ticketService.getMyServiceTlTickets({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() === '' ? undefined : debouncedSearch.trim(),
        status: openOnly ? 'Open' : filters.status || undefined,
        priority: filters.priority || undefined,
        hub: filters.hub || undefined,
        technician: filters.technician || undefined,
        category: filters.category || undefined,
        vehicleModel: filters.vehicleModel || undefined,
        vehicleType: filters.vehicleType || undefined,
        fromDate: filters.startDate || undefined,
        toDate: filters.endDate || undefined,
        sortBy: mapSortToBackend(sortState.key),
        sortOrder: sortState.direction,
      });

      const mappedTickets = response.items.map(mapTicketListItemToTicket);
      setTickets(mappedTickets);
      setTotalCount(response.totalRecords);

      if (mappedTickets.length === 0) {
        setSelectedTicketId(null);
        setSelectedTicket(null);
      } else if (
        !selectedTicketId ||
        !mappedTickets.some((ticket) => ticket.id === selectedTicketId)
      ) {
        setSelectedTicketId(mappedTickets[0].id);
      }
    } catch (error) {
      setErrorMessage(toApiErrorMessage(error));
      setTickets([]);
      setTotalCount(0);
      setSelectedTicketId(null);
      setSelectedTicket(null);
    } finally {
      setLoadingList(false);
    }
  }, [
    page,
    openOnly,
    filters,
    debouncedSearch,
    selectedTicketId,
    sortState.direction,
    sortState.key,
  ]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) return;
    void loadTicketDetail(selectedTicketId).catch(() => {
      setErrorMessage('Failed to load ticket details.');
    });
  }, [loadTicketDetail, selectedTicketId]);

  const handleRefreshTicket = async (ticketId: string) => {
    await loadTicketDetail(ticketId);
    await loadTickets();
  };

  const jobCardRows = useMemo(() => tickets.filter((ticket) => ticket.jobCardNumber), [tickets]);

  const filterOptions = useMemo(() => {
    const hubs = Array.from(new Set(tickets.map((ticket) => ticket.hub).filter(Boolean))).sort();
    const categories = Array.from(
      new Set(tickets.map((ticket) => ticket.category).filter(Boolean))
    ).sort();
    const technicians = Array.from(
      new Set(
        tickets
          .map((ticket) => ticket.assignedTechnician)
          .filter((value) => value !== '' && value !== 'Unassigned')
      )
    ).sort();
    const vehicleModels = Array.from(
      new Set(tickets.map((ticket) => ticket.model).filter(Boolean))
    ).sort();

    return {
      ...DEFAULT_FILTER_OPTIONS,
      hubs,
      categories,
      technicians,
      vehicleModels,
    };
  }, [tickets]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-500">
            Service Engineer workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            My Tickets ({totalCount})
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tickets currently assigned to you for review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<PackageCheck className="h-4 w-4" />}
            onClick={() => setShowReturnToInventoryModal(true)}
          >
            Return to Inventory from Job Card
          </Button>
          <Button
            size="sm"
            variant={openOnly ? 'primary' : 'outline'}
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => {
              setOpenOnly((current) => !current);
              setPage(1);
            }}
          >
            {openOnly ? 'Showing Open Only' : 'Show Open Tickets'}
          </Button>
        </div>
      </header>

      {errorMessage !== '' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {errorMessage}
        </div>
      )}

      <TicketFilters
        filters={filters}
        options={filterOptions}
        onChange={(updates) => {
          setFilters((current) => ({ ...current, ...updates }));
          setPage(1);
        }}
      />

      <ClosureRequestQueue onDecided={() => void loadTickets()} />

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setView('TICKETS')}
          aria-pressed={view === 'TICKETS'}
          className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            view === 'TICKETS'
              ? 'border-b-2 border-primary text-primary dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Tickets
        </button>
        <button
          type="button"
          onClick={() => setView('JOB_CARDS')}
          aria-pressed={view === 'JOB_CARDS'}
          className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            view === 'JOB_CARDS'
              ? 'border-b-2 border-primary text-primary dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Job Cards ({jobCardRows.length})
        </button>
      </div>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_560px]">
        {view === 'TICKETS' ? (
          <TicketTable
            rows={tickets}
            selectedTicketId={selectedTicket?.id ?? null}
            onSelectTicket={(ticket) => {
              setSelectedTicketId(ticket.id);
              setSelectedTicket(ticket);
            }}
            loading={loadingList}
            sortState={sortState}
            onSortChange={(nextSort) => {
              setSortState(nextSort);
              setPage(1);
            }}
            page={page}
            perPage={PAGE_SIZE}
            total={totalCount}
            onPageChange={setPage}
          />
        ) : (
          <JobCardsList
            rows={jobCardRows}
            loading={loadingList}
            selectedTicketId={selectedTicket?.id ?? null}
            onSelectTicket={(ticket) => {
              setSelectedTicketId(ticket.id);
              setSelectedTicket(ticket);
            }}
          />
        )}
        <TicketPreview ticket={selectedTicket} onRefreshTicket={handleRefreshTicket} />
      </section>

      <ReturnToInventoryFromJobCardModal
        isOpen={showReturnToInventoryModal}
        onClose={() => setShowReturnToInventoryModal(false)}
      />
    </div>
  );
}
