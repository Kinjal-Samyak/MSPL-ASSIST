import { useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GitBranch,
  Layers,
  Lock,
  MessageCircle,
  PackageSearch,
  RotateCcw,
  Truck,
  Undo2,
  UserCheck,
  X,
} from 'lucide-react';
import { Badge, Button, Card, Input, Select, Timeline, type TimelineEntry } from '@/components/ui';
import type { BadgeVariant } from '@/types';
import { DataTable, type DataTableColumn } from '@/components/data';
import { JOB_CARD_STATUS_LABELS } from '@/constants/jobCardStatus';
import { lookupService } from '@/services/lookupService';
import { ticketService, type TicketClosureRequest } from '@/services/ticketService';
import { toast } from '@/utils';
import { useKeyboardShortcut } from '@/hooks';
import {
  CommunicationCenterPanel,
  TicketClosePaymentDialog,
  type TicketClosePaymentPayload,
} from '@/features/tickets/components';
import {
  TicketClosureRequestDialog,
  type ClosureRequestSubmitPayload,
  type ClosureRequestType,
} from '../components/TicketClosureRequestDialog';
import {
  CreateFollowUpTicketDialog,
  type FollowUpTicketSubmitPayload,
} from '../components/CreateFollowUpTicketDialog';
import { coordinatorService } from '../services/coordinatorService';

const statuses = [
  'Open',
  'Assigned',
  'In Progress',
  'Waiting for Parts',
  'Ready for Delivery',
  'Closed',
];

type WorkflowStageFilter =
  | ''
  | 'CREATED'
  | 'REOPENED'
  | 'SERVICE_TL_REVIEW'
  | 'CONSULTATION_RESOLVED'
  | 'WORKSHOP_REQUIRED'
  | 'RFD'
  | 'CLOSED'
  | 'CANCELLED';

const WORKFLOW_STAGE_CARDS: Array<{
  key: WorkflowStageFilter;
  label: string;
  icon: typeof Layers;
}> = [
  { key: '', label: 'All Tickets', icon: Layers },
  { key: 'CREATED', label: 'Open Tickets', icon: ClipboardList },
  { key: 'REOPENED', label: 'Reopened', icon: RotateCcw },
  { key: 'SERVICE_TL_REVIEW', label: 'Service Engineer Review', icon: UserCheck },
  { key: 'CONSULTATION_RESOLVED', label: 'Consultation Resolved', icon: CheckCircle2 },
  { key: 'WORKSHOP_REQUIRED', label: 'Workshop Required', icon: PackageSearch },
  { key: 'RFD', label: 'Ready for Delivery', icon: Truck },
  { key: 'CLOSED', label: 'Closed Tickets', icon: Lock },
  { key: 'CANCELLED', label: 'Cancelled Tickets', icon: Ban },
];

/** Only CREATED, REOPENED and RFD are owned by the Coordinator; the rest are read-only visibility into Workshop. */
const COORDINATOR_OWNED_STAGES: WorkflowStageFilter[] = ['CREATED', 'REOPENED', 'RFD'];

function statusBadgeVariant(status: string | undefined | null): BadgeVariant {
  const value = (status ?? '').toLowerCase();
  if (value.includes('cancelled')) return 'danger';
  if (value.includes('closed')) return 'neutral';
  if (value.includes('reopened')) return 'warning';
  if (value.includes('ready') || value.includes('rfd')) return 'success';
  if (value.includes('waiting')) return 'warning';
  if (
    value.includes('review') ||
    value.includes('progress') ||
    value.includes('pending') ||
    value.includes('verification')
  )
    return 'info';
  return 'default';
}

export function CoordinatorTicketWorkbenchPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [search, setSearch] = useState('');
  const [workflowStage, setWorkflowStage] = useState<WorkflowStageFilter>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isReadOnlyStage = workflowStage !== '' && !COORDINATOR_OWNED_STAGES.includes(workflowStage);

  const load = async () => {
    setLoading(true);
    try {
      const [list, counts] = await Promise.all([
        coordinatorService.getWorkbench({
          search,
          workflowStage: workflowStage || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          page: 1,
          pageSize: 50,
        }),
        coordinatorService.getWorkbenchSummary(),
      ]);
      setRows(list.items);
      setSummary(counts);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 250);
    return () => clearTimeout(timeout);
  }, [search, workflowStage, fromDate, toDate]);

  const open = async (id: string) => {
    try {
      setDetail(await coordinatorService.getWorkbenchDetail(id));
    } catch {
      setError('Unable to load ticket details.');
      toast.error('Unable to load ticket details.');
    }
  };

  const columns: Array<DataTableColumn<any>> = [
    {
      key: 'ticketNumber',
      header: 'Ticket',
      sortable: true,
      accessor: (row) => row.ticketNumber,
      render: (row) => (
        <span className="font-semibold text-primary dark:text-blue-300">{row.ticketNumber}</span>
      ),
    },
    { key: 'customerName', header: 'Rider', sortable: true, accessor: (row) => row.customerName },
    {
      key: 'vehicleNumber',
      header: 'Vehicle',
      sortable: true,
      accessor: (row) => row.vehicleNumber ?? '',
      render: (row) => row.vehicleNumber ?? '—',
    },
    {
      key: 'hub',
      header: 'Hub',
      sortable: true,
      accessor: (row) => row.hub ?? '',
      render: (row) => row.hub ?? '—',
    },
    { key: 'category', header: 'Issue', render: (row) => row.category },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => row.effectiveStatus ?? row.status,
      render: (row) => (
        <Badge variant={statusBadgeVariant(row.effectiveStatus ?? row.status)}>
          {row.effectiveStatus ?? row.status}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      accessor: (row) => row.priority,
      render: (row) =>
        row.highPriority ? (
          <Badge variant="danger">High priority</Badge>
        ) : (
          <Badge variant="neutral">{row.priority}</Badge>
        ),
    },
    {
      key: 'eta',
      header: 'ETA',
      sortable: true,
      accessor: (row) => row.eta ?? '',
      render: (row) => (row.eta ? new Date(row.eta).toLocaleString() : '—'),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      accessor: (row) => row.updatedAt,
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-5 p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-warning dark:text-amber-400">
          Coordinator module
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-50">
          Ticket Workbench
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track every ticket by workflow stage and act on the ones you own.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {WORKFLOW_STAGE_CARDS.map(({ key, label, icon: Icon }) => {
          const selected = workflowStage === key;
          const count =
            key === ''
              ? Object.values(summary.workflowStageCounts ?? {}).reduce(
                  (sum: number, value) => sum + (Number(value) || 0),
                  0
                )
              : key === 'CLOSED'
                ? (summary.closedTotal ?? 0)
                : key === 'CANCELLED'
                  ? (summary.cancelledTotal ?? 0)
                  : (summary.workflowStageCounts?.[key] ?? 0);
          return (
            <button
              key={key || 'all'}
              type="button"
              onClick={() => setWorkflowStage(key)}
              aria-pressed={selected}
              className="rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              <Card
                padding="sm"
                className={
                  selected
                    ? 'border-primary shadow-md shadow-primary/10 ring-1 ring-primary dark:border-blue-500'
                    : 'hover:-translate-y-0.5'
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <Icon
                    className={
                      selected
                        ? 'h-4 w-4 text-primary dark:text-blue-400'
                        : 'h-4 w-4 text-slate-300 dark:text-slate-600'
                    }
                  />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {count}
                </p>
              </Card>
            </button>
          );
        })}
      </div>
      {isReadOnlyStage && workflowStage !== 'CLOSED' && workflowStage !== 'CANCELLED' && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200">
          Read-only visibility — this stage is owned by the Workshop/Service Engineer workspace.
          Coordinators can view these tickets here but cannot act on them.
        </p>
      )}
      {workflowStage === 'CLOSED' && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200">
          Closed tickets are read-only. Open a ticket and use Reopen Ticket to send it back to the
          Coordinator for Service Engineer reassignment.
        </p>
      )}
      {workflowStage === 'CANCELLED' && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200">
          Cancelled tickets are read-only and were approved by a Service Engineer via the Request
          Cancellation flow.
        </p>
      )}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              className="mb-1 block text-xs text-slate-500 dark:text-slate-400"
              htmlFor="workbench-from-date"
            >
              From
            </label>
            <Input
              id="workbench-from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs text-slate-500 dark:text-slate-400"
              htmlFor="workbench-to-date"
            >
              To
            </label>
            <Input
              id="workbench-to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
            >
              Clear dates
            </Button>
          )}
        </div>
      </Card>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        onRowClick={(row) => void open(row.id)}
        selectedRowKey={detail?.id ?? null}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ticket, rider, vehicle or phone"
        emptyTitle="No matching tickets"
        emptyDescription="Try a different search term, date range or workflow stage."
      />
      {detail && (
        <TicketDrawer
          detail={detail}
          onClose={() => setDetail(null)}
          onSaved={async () => {
            setDetail(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function TicketDrawer({
  detail,
  onClose,
  onSaved,
}: {
  detail: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(detail.status);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [serviceTls, setServiceTls] = useState<Array<{ id: string; name: string }>>([]);
  const [workflowServiceTlId, setWorkflowServiceTlId] = useState('');
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowError, setWorkflowError] = useState('');
  const [reopenRemarks, setReopenRemarks] = useState('');
  const [reopenBusy, setReopenBusy] = useState(false);
  const [reopenError, setReopenError] = useState('');
  const [showReturnToWorkshop, setShowReturnToWorkshop] = useState(false);
  const [returnToWorkshopRemarks, setReturnToWorkshopRemarks] = useState('');
  const [returnToWorkshopBusy, setReturnToWorkshopBusy] = useState(false);
  const [returnToWorkshopError, setReturnToWorkshopError] = useState('');
  const [showClosePaymentModal, setShowClosePaymentModal] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [closureRequests, setClosureRequests] = useState<TicketClosureRequest[]>([]);
  const [closureDialogType, setClosureDialogType] = useState<ClosureRequestType | null>(null);
  const [closureBusy, setClosureBusy] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [showCommunicationCenter, setShowCommunicationCenter] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpBusy, setFollowUpBusy] = useState(false);

  useKeyboardShortcut('Escape', onClose, {
    enabled:
      !showClosePaymentModal &&
      !closureDialogType &&
      !showCommunicationCenter &&
      !showFollowUpDialog,
  });

  useEffect(() => {
    let active = true;
    lookupService
      .getServiceTls()
      .then((result) => {
        if (active) setServiceTls(result);
      })
      .catch(() => {
        if (active) setServiceTls([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadClosureRequests = async () => {
    try {
      const requests = await coordinatorService.getTicketClosureRequests(detail.id);
      setClosureRequests(requests);
    } catch {
      setClosureRequests([]);
    }
  };

  useEffect(() => {
    void loadClosureRequests();
  }, [detail.id]);

  const pendingClosureRequest =
    closureRequests.find((request) => request.status === 'PENDING') ?? null;
  const isTerminalStatus = detail.status === 'Closed' || detail.status === 'Cancelled';

  const submitClosureRequest = async (payload: ClosureRequestSubmitPayload) => {
    setClosureBusy(true);
    setClosureError('');
    try {
      await coordinatorService.requestTicketClosure(detail.id, payload);
      setClosureDialogType(null);
      toast.success('Request submitted', {
        description: `Sent to the Service Engineer for approval to ${payload.requestType === 'CANCELLATION' ? 'cancel' : 'close'} ${detail.ticketNumber}.`,
      });
      await loadClosureRequests();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to submit this request.';
      setClosureError(message);
      toast.error('Unable to submit request', { description: message });
    } finally {
      setClosureBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await coordinatorService.updateWorkbenchStatus(detail.id, status, remarks || undefined);
      toast.success('Ticket updated', {
        description: `${detail.ticketNumber} saved successfully.`,
      });
      await onSaved();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to save ticket changes.';
      setError(message);
      toast.error('Unable to save changes', { description: message });
    } finally {
      setBusy(false);
    }
  };

  const runWorkflowAction = async (action: () => Promise<unknown>) => {
    setWorkflowBusy(true);
    setWorkflowError('');
    try {
      await action();
      await onSaved();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to update this ticket.';
      setWorkflowError(message);
      toast.error('Unable to update ticket', { description: message });
    } finally {
      setWorkflowBusy(false);
    }
  };

  const assignServiceTl = async () => {
    if (!workflowServiceTlId) {
      setWorkflowError('Select a Service Engineer before assigning this ticket.');
      return;
    }
    await runWorkflowAction(async () => {
      await ticketService.assignServiceTl(detail.id, { serviceTlId: workflowServiceTlId });
      toast.success('Service Engineer assigned', {
        description: `${detail.ticketNumber} moved to Service Engineer Review.`,
      });
    });
  };

  const handleClose = async (payment: TicketClosePaymentPayload) => {
    setCloseBusy(true);
    setError('');
    try {
      await coordinatorService.closeTicket(detail.id, payment);
      setShowClosePaymentModal(false);
      toast.success('Ticket closed', { description: `${detail.ticketNumber} has been closed.` });
      await onSaved();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to close this ticket.';
      setError(message);
      toast.error('Unable to close ticket', { description: message });
    } finally {
      setCloseBusy(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenRemarks.trim()) {
      setReopenError('A reason is required to reopen this ticket.');
      return;
    }
    setReopenBusy(true);
    setReopenError('');
    try {
      await coordinatorService.reopenTicket(detail.id, reopenRemarks.trim());
      toast.success('Ticket reopened', {
        description: `${detail.ticketNumber} sent back to Created.`,
      });
      await onSaved();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to reopen this ticket.';
      setReopenError(message);
      toast.error('Unable to reopen ticket', { description: message });
    } finally {
      setReopenBusy(false);
    }
  };

  const handleReturnToWorkshop = async () => {
    if (!returnToWorkshopRemarks.trim()) {
      setReturnToWorkshopError('A reason is required to return this ticket to the workshop.');
      return;
    }
    setReturnToWorkshopBusy(true);
    setReturnToWorkshopError('');
    try {
      await coordinatorService.returnTicketToWorkshop(detail.id, returnToWorkshopRemarks.trim());
      toast.success('Ticket returned to workshop', {
        description: `${detail.ticketNumber} sent back for rework.`,
      });
      await onSaved();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to return this ticket to the workshop.';
      setReturnToWorkshopError(message);
      toast.error('Unable to return to workshop', { description: message });
    } finally {
      setReturnToWorkshopBusy(false);
    }
  };

  const handleCreateFollowUp = async (payload: FollowUpTicketSubmitPayload) => {
    setFollowUpBusy(true);
    try {
      const created = await coordinatorService.createFollowUpTicket(detail.id, payload);
      setShowFollowUpDialog(false);
      toast.success('Follow-up ticket created', {
        description: `${created.ticketNumber} created as a follow-up of ${detail.ticketNumber}.`,
      });
      await onSaved();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to create a follow-up ticket.';
      toast.error('Unable to create follow-up ticket', { description: message });
    } finally {
      setFollowUpBusy(false);
    }
  };

  const timelineEntries: TimelineEntry[] = (detail.timeline ?? []).map((entry: any) => ({
    id: entry.id,
    title: entry.description,
    timestamp: entry.performedAt,
    actor: entry.performedBy?.name ?? 'System',
  }));

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-label={`Ticket ${detail.ticketNumber}`}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-200 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900">
        <button
          aria-label="Close ticket details"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-xs font-semibold uppercase text-warning dark:text-amber-400">
          {detail.ticketNumber}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {detail.customerName}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant(detail.effectiveStatus ?? detail.status)}>
            {detail.effectiveStatus ?? detail.status}
          </Badge>
          {detail.parentTicket && (
            <Badge variant="info">
              <GitBranch className="mr-1 inline h-3 w-3" />
              Follow-up of {detail.parentTicket.ticketNumber}
            </Badge>
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {detail.vehicleNumber ?? 'No vehicle'} · {detail.category}
          </span>
        </div>
        {detail.followUpTickets?.length > 0 && (
          <div className="mt-2 space-y-1 rounded-xl border border-primary/20 bg-primary/10 p-3 dark:border-blue-900/50 dark:bg-blue-500/10">
            <p className="text-xs font-semibold uppercase text-primary dark:text-blue-300">
              Follow-up tickets
            </p>
            {detail.followUpTickets.map(
              (followUp: {
                id: string;
                ticketNumber: string;
                status: string;
                createdAt: string;
              }) => (
                <p key={followUp.id} className="text-sm text-slate-700 dark:text-slate-200">
                  {followUp.ticketNumber} ·{' '}
                  <Badge variant={statusBadgeVariant(followUp.status)}>{followUp.status}</Badge>{' '}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    created {new Date(followUp.createdAt).toLocaleDateString()}
                  </span>
                </p>
              )
            )}
          </div>
        )}
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<MessageCircle className="h-4 w-4" />}
            onClick={() => setShowCommunicationCenter(true)}
          >
            Communication Center
          </Button>
        </div>
        {pendingClosureRequest ? (
          <div className="mt-4 space-y-1 rounded-xl border border-warning/30 bg-warning/10 p-3 dark:border-amber-500/40 dark:bg-amber-500/5">
            <p className="text-xs font-semibold uppercase text-warning dark:text-amber-300">
              {pendingClosureRequest.requestType === 'CANCELLATION'
                ? 'Cancellation'
                : 'Early Closure'}{' '}
              requested — awaiting Service Engineer approval
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {pendingClosureRequest.reason}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Requested by {pendingClosureRequest.requestedByName} on{' '}
              {new Date(pendingClosureRequest.requestedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          !isTerminalStatus && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClosureDialogType('CANCELLATION')}
              >
                Request Cancellation
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClosureDialogType('EARLY_CLOSURE')}
              >
                Request Early Closure
              </Button>
            </div>
          )
        )}
        {closureRequests.some((request) => request.status === 'REJECTED') &&
          !pendingClosureRequest && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Last request rejected:{' '}
              {closureRequests.find((request) => request.status === 'REJECTED')?.decisionRemarks}
            </p>
          )}
        {closureError && (
          <p role="alert" className="mt-2 text-xs text-danger dark:text-red-400">
            {closureError}
          </p>
        )}
        {(detail.workflowStage === 'CREATED' || detail.workflowStage === 'REOPENED') && (
          <div className="mt-4 space-y-2 rounded-xl border border-warning/30 bg-warning/10 p-3 dark:border-amber-500/40 dark:bg-amber-500/5">
            <p className="text-xs font-semibold uppercase text-warning dark:text-amber-300">
              Workflow: {detail.workflowStage === 'REOPENED' ? 'Reopened' : 'Created'} → Service
              Engineer Review
            </p>
            {detail.workflowStage === 'REOPENED' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This ticket stays Reopened until a technician is assigned or the Service Engineer
                resolves it through consultation.
              </p>
            )}
            <Select
              value={workflowServiceTlId}
              onChange={(event) => setWorkflowServiceTlId(event.target.value)}
              placeholder="Select Service Engineer"
              options={serviceTls.map((serviceTl) => ({
                value: serviceTl.id,
                label: serviceTl.name,
              }))}
            />
            {workflowError && (
              <p role="alert" className="text-sm text-danger dark:text-red-400">
                {workflowError}
              </p>
            )}
            <Button loading={workflowBusy} onClick={() => void assignServiceTl()}>
              Assign Service Engineer
            </Button>
          </div>
        )}
        {detail.status === 'Closed' && detail.reopenCount < 1 && (
          <div className="mt-4 space-y-2 rounded-xl border border-danger/30 bg-danger/10 p-3 dark:border-red-500/40 dark:bg-red-500/5">
            <p className="text-xs font-semibold uppercase text-danger dark:text-red-300">
              This ticket is closed
            </p>
            <label className="block text-sm text-slate-700 dark:text-slate-200">
              Reason to reopen
              <textarea
                value={reopenRemarks}
                onChange={(event) => setReopenRemarks(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                rows={2}
              />
            </label>
            {reopenError && (
              <p role="alert" className="text-sm text-danger dark:text-red-400">
                {reopenError}
              </p>
            )}
            <Button loading={reopenBusy} onClick={() => void handleReopen()}>
              Reopen Ticket
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reopening sends this ticket back to Reopened so you can assign a Service Engineer
              again. A ticket can only be reopened once — after that, a follow-up ticket is created
              instead.
            </p>
          </div>
        )}
        {detail.status === 'Closed' && detail.reopenCount >= 1 && (
          <div className="mt-4 space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-3 dark:border-blue-500/40 dark:bg-blue-500/5">
            <p className="text-xs font-semibold uppercase text-primary dark:text-blue-300">
              This ticket has already been reopened once
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              It can't be reopened again. Create a follow-up ticket instead — it will carry the same
              rider, vehicle and issue category, linked back to this ticket as its parent.
            </p>
            <Button
              size="sm"
              leftIcon={<GitBranch className="h-4 w-4" />}
              onClick={() => setShowFollowUpDialog(true)}
            >
              Create Follow-up Ticket
            </Button>
          </div>
        )}
        {detail.workflowStage === 'SERVICE_TL_REVIEW' && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 dark:border-amber-500/40 dark:bg-amber-500/5">
            <p className="text-xs font-semibold uppercase text-warning dark:text-amber-300">
              Workflow: Service Engineer Review{detail.serviceTl ? ` · ${detail.serviceTl}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This ticket is now with the Service Engineer for review. Coordinators cannot act on it
              further here; the Service Engineer will decide Consultation Resolved or Workshop
              Required.
            </p>
          </div>
        )}
        {(detail.workflowStage === 'WORKSHOP_REQUIRED' || detail.workflowStage === 'RFD') &&
          detail.jobCardStage && (
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 dark:border-amber-500/40 dark:bg-amber-500/5">
              <p className="text-xs font-semibold uppercase text-warning dark:text-amber-300">
                Job Card{detail.jobCardTechnician ? ` · ${detail.jobCardTechnician}` : ''}:{' '}
                {JOB_CARD_STATUS_LABELS[
                  detail.jobCardStage as keyof typeof JOB_CARD_STATUS_LABELS
                ] ?? detail.jobCardStage}
              </p>
            </div>
          )}
        {detail.workflowStage === 'RFD' && (
          <div className="mt-4 space-y-2 rounded-xl border border-success/30 bg-success/10 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/5">
            <p className="text-xs font-semibold uppercase text-success dark:text-emerald-300">
              Ready for Delivery
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Once the vehicle has been delivered to the customer, close this ticket and record the
              payment received.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowClosePaymentModal(true)}>
                Close Ticket
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Undo2 className="h-4 w-4" />}
                onClick={() => setShowReturnToWorkshop((current) => !current)}
              >
                Return to Workshop
              </Button>
            </div>
            {showReturnToWorkshop && (
              <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3 dark:border-amber-500/40 dark:bg-amber-500/5">
                <label className="block text-sm text-slate-700 dark:text-slate-200">
                  Reason for returning to the workshop
                  <textarea
                    value={returnToWorkshopRemarks}
                    onChange={(event) => setReturnToWorkshopRemarks(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                    rows={2}
                    placeholder="Required: what issue was found with the vehicle?"
                  />
                </label>
                {returnToWorkshopError && (
                  <p role="alert" className="text-sm text-danger dark:text-red-400">
                    {returnToWorkshopError}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  loading={returnToWorkshopBusy}
                  onClick={() => void handleReturnToWorkshop()}
                >
                  Confirm Return to Workshop
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sends the ticket back to{' '}
                  {detail.serviceTl ? detail.serviceTl : 'the assigned Service Engineer'} for review
                  - same as a new ticket, they'll reassign a technician (same or different) to
                  reopen the job card for rework.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 space-y-4">
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={statuses.map((value) => ({ value, label: value }))}
          />
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            Internal remarks
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              rows={3}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </p>
          )}
          <Button loading={busy} onClick={() => void save()}>
            Save changes
          </Button>
        </div>
        <h3 className="mt-8 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50">
          <Clock3 className="h-4 w-4 text-slate-400" />
          Timeline
        </h3>
        <div className="mt-3">
          <Timeline items={timelineEntries} />
        </div>
      </aside>
      <TicketClosePaymentDialog
        isOpen={showClosePaymentModal}
        onClose={() => setShowClosePaymentModal(false)}
        onConfirm={(payment: TicketClosePaymentPayload) => handleClose(payment)}
        ticketId={detail.id}
        chargesIncurred={detail.chargesIncurred}
        finalSparePartsAmount={detail.finalSparePartsAmount}
        busy={closeBusy}
        requireRemarks
      />
      {closureDialogType && (
        <TicketClosureRequestDialog
          isOpen
          onClose={() => setClosureDialogType(null)}
          onSubmit={submitClosureRequest}
          requestType={closureDialogType}
          chargesIncurred={detail.chargesIncurred}
          finalSparePartsAmount={detail.finalSparePartsAmount}
          busy={closureBusy}
        />
      )}
      <CommunicationCenterPanel
        isOpen={showCommunicationCenter}
        onClose={() => setShowCommunicationCenter(false)}
        ticketId={detail.id}
      />
      <CreateFollowUpTicketDialog
        isOpen={showFollowUpDialog}
        onClose={() => setShowFollowUpDialog(false)}
        onSubmit={handleCreateFollowUp}
        parentTicketNumber={detail.ticketNumber}
        customerName={detail.customerName}
        vehicleNumber={detail.vehicleNumber}
        category={detail.category}
        busy={followUpBusy}
      />
    </div>
  );
}
