import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CreateTicketWizardModal,
  TicketFilters,
  TicketTable,
  TicketToolbar,
  TicketWorkflowDetail,
} from '@/features/tickets/components';
import type { CreateTicketSubmission } from '@/features/tickets/components/CreateTicketWizardModal';
import {
  mapSortToBackend,
  mapTicketDetailToTicket,
  mapTicketListItemToTicket,
  toBackendPriority,
} from '@/features/tickets/types/ticket.api';
import type { Ticket, TicketFiltersState } from '@/features/tickets/types/ticket.types';
import { toApiErrorMessage } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { commentService } from '@/services/commentService';
import { notificationService } from '@/services/notificationService';
import { ticketService } from '@/services/ticketService';

type SortKey =
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

interface SortState {
  key: SortKey;
  direction: 'asc' | 'desc';
}

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

const DEFAULT_SORT: SortState = { key: 'createdAt', direction: 'desc' };
const PAGE_SIZE = 12;

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

export function TicketWorkspacePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<TicketFiltersState>(DEFAULT_FILTERS);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ticketsRef = useRef<Ticket[]>([]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    if (successMessage === '') return undefined;
    const timeout = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const replaceTicket = useCallback((nextTicket: Ticket) => {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === nextTicket.id ? { ...ticket, ...nextTicket } : ticket))
    );
    setSelectedTicket(nextTicket);
  }, []);

  const loadTicketDetail = useCallback(
    async (ticketId: string) => {
      const baseTicket = ticketsRef.current.find((ticket) => ticket.id === ticketId);
      const [detail, comments, attachments, notifications] = await Promise.all([
        ticketService.getTicketById(ticketId),
        commentService.getComments(ticketId),
        attachmentService.getAttachments(ticketId),
        notificationService.getNotifications(ticketId),
      ]);

      const mappedDetail = mapTicketDetailToTicket(detail, baseTicket);
      const enrichedDetail: Ticket = {
        ...mappedDetail,
        comments: comments.map((comment) => ({
          id: comment.id,
          author: comment.userName ?? 'System',
          timestamp: comment.createdAt,
          message: comment.text,
          channel:
            comment.commentType === 'INTERNAL'
              ? 'COORDINATOR'
              : comment.commentType === 'TECHNICIAN'
                ? 'TECHNICIAN'
                : comment.commentType === 'CUSTOMER'
                  ? 'CUSTOMER'
                  : 'SYSTEM',
        })),
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.fileName,
          fileType: attachment.fileType.toUpperCase().includes('IMAGE')
            ? 'IMAGE'
            : attachment.fileType.toUpperCase().includes('DOC')
              ? 'DOCX'
              : attachment.fileType.toUpperCase().includes('INVOICE')
                ? 'INVOICE'
                : attachment.fileType.toUpperCase().includes('REPORT')
                  ? 'SERVICE_REPORT'
                  : 'PDF',
          uploadedAt: attachment.uploadedAt,
          uploadedBy: attachment.uploadedBy,
        })),
        notificationHistory: notifications.map((entry) => ({
          id: entry.id,
          channel:
            entry.channel.toUpperCase() === 'WHATSAPP'
              ? 'WHATSAPP'
              : entry.channel.toUpperCase() === 'SMS'
                ? 'SMS'
                : entry.channel.toUpperCase() === 'EMAIL'
                  ? 'EMAIL'
                  : 'REMINDER',
          recipient: entry.recipient,
          timestamp: entry.sentTime ?? detail.ticketSummary.updatedAt,
          status:
            entry.status.toUpperCase() === 'DELIVERED'
              ? 'DELIVERED'
              : entry.status.toUpperCase() === 'FAILED'
                ? 'FAILED'
                : entry.status.toUpperCase() === 'PENDING'
                  ? 'PENDING'
                  : 'SENT',
        })),
      };
      replaceTicket(enrichedDetail);
      return enrichedDetail;
    },
    [replaceTicket]
  );

  const loadTickets = useCallback(async () => {
    setLoadingList(true);
    setErrorMessage('');

    try {
      const response = await ticketService.getTickets({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() === '' ? undefined : debouncedSearch.trim(),
        status: filters.status || undefined,
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
        setSelectedTicket(mappedTickets[0]);
      } else {
        setSelectedTicket((current) =>
          current && current.id === selectedTicketId
            ? current
            : (mappedTickets.find((ticket) => ticket.id === selectedTicketId) ?? mappedTickets[0])
        );
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
  }, [debouncedSearch, filters, page, selectedTicketId, sortState.direction, sortState.key]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) return;
    void loadTicketDetail(selectedTicketId).catch(() => {
      setErrorMessage('Failed to load ticket details.');
    });
  }, [loadTicketDetail, selectedTicketId]);

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

  const handleRefresh = () => {
    void loadTickets();
  };

  const handleRefreshTicket = async (ticketId: string) => {
    await loadTicketDetail(ticketId);
  };

  const handleCreateTicketSubmit = async (payload: CreateTicketSubmission): Promise<void> => {
    const description =
      payload.description.trim() === ''
        ? `${payload.issueCategory} / ${payload.issueSubcategory}`
        : payload.description.trim();

    const created = await ticketService.createTicket({
      registeredMobile: payload.registeredMobile,
      issueCategoryId: payload.issueCategoryId,
      issueDescription: description,
      priority: toBackendPriority(payload.priority),
      vehicleNumber: payload.vehicleNumber,
      mvTrackNumber: payload.mvTrackNumber,
    });

    if (!created.existingTicket && created.ticketId && payload.attachments.length > 0) {
      await Promise.all(
        payload.attachments.map((file) =>
          attachmentService.addAttachment(created.ticketId!, {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            uploadedBy: 'Operations Coordinator',
          })
        )
      );
    }

    setPage(1);
    await loadTickets();

    if (created.ticketId) {
      setSelectedTicketId(created.ticketId);
      await handleRefreshTicket(created.ticketId);
    }

    setSuccessMessage(`Ticket ${created.ticketNumber} created successfully.`);
  };

  const handleConversationTicketCreated = (created: {
    existingTicket: boolean;
    ticketId?: string;
    ticketNumber: string;
  }) => {
    setPage(1);
    void loadTickets();

    if (created.ticketId) {
      setSelectedTicketId(created.ticketId);
      void handleRefreshTicket(created.ticketId).catch((error) =>
        setErrorMessage(toApiErrorMessage(error))
      );
    }

    setSuccessMessage(
      created.existingTicket
        ? `An active ticket already exists: ${created.ticketNumber}.`
        : `Ticket ${created.ticketNumber} created successfully.`
    );
  };

  const handleViewConversationTicket = (ticketId: string) => {
    setIsCreateOpen(false);
    setSelectedTicketId(ticketId);
    void handleRefreshTicket(ticketId).catch((error) => setErrorMessage(toApiErrorMessage(error)));
  };

  return (
    <div className="space-y-6 p-6">
      {successMessage !== '' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage !== '' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {errorMessage}
        </div>
      )}

      <TicketToolbar
        count={totalCount}
        onRefresh={handleRefresh}
        onCreateTicket={() => setIsCreateOpen(true)}
      />

      <TicketFilters
        filters={filters}
        options={filterOptions}
        onChange={(updates) => {
          setFilters((current) => ({ ...current, ...updates }));
          setPage(1);
        }}
      />

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
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
        <TicketWorkflowDetail
          ticket={selectedTicket}
          onTicketUpdated={() => {
            if (selectedTicket) void loadTicketDetail(selectedTicket.id);
          }}
        />
      </section>

      <CreateTicketWizardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTicketSubmit}
        onConversationCreated={handleConversationTicketCreated}
        onViewTicket={handleViewConversationTicket}
      />
    </div>
  );
}
