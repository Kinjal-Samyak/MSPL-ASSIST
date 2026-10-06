import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  IndianRupee,
  PackagePlus,
  PlusCircle,
  Search,
  Settings2,
  TicketCheck,
  TrendingUp,
  Truck,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { EmptyState, ErrorState, Loader } from '@/components/feedback';
import { Badge, Button, Card, CardHeader, CardTitle, Input } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { dashboardService, type DashboardSummaryResponse } from '@/services/dashboardService';
import {
  KpiSparkCard,
  SlaComplianceDonut,
  TicketsTrendChart,
  TopHubsChart,
} from '@/features/dashboard/components';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';
import { formatDateTime } from '@/utils';

type Period = 'TODAY' | '7D' | '30D' | 'MONTH' | 'YEAR' | 'CUSTOM';

const PERIOD_OPTIONS: Array<{ key: Period; label: string }> = [
  { key: 'TODAY', label: 'Today' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: 'MONTH', label: 'This Month' },
  { key: 'YEAR', label: 'This Year' },
];

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeRange(
  period: Period,
  customFrom: string,
  customTo: string
): { from?: string; to?: string } {
  const today = new Date();
  if (period === 'CUSTOM') {
    return { from: customFrom || undefined, to: customTo || undefined };
  }
  if (period === 'TODAY') {
    return { from: toDateInputValue(today), to: toDateInputValue(today) };
  }
  if (period === '7D') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toDateInputValue(from), to: toDateInputValue(today) };
  }
  if (period === '30D') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toDateInputValue(from), to: toDateInputValue(today) };
  }
  if (period === 'MONTH') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toDateInputValue(from), to: toDateInputValue(today) };
  }
  const from = new Date(today.getFullYear(), 0, 1);
  return { from: toDateInputValue(from), to: toDateInputValue(today) };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function priorityLabel(priority: string): string {
  if (priority === 'CRITICAL') return 'Critical';
  if (priority === 'HIGH') return 'High';
  if (priority === 'MEDIUM') return 'Medium';
  return 'Low';
}

const QUICK_ACTIONS = [
  { id: 'new-ticket', label: 'New Ticket', icon: PlusCircle, href: ROUTES.TICKETS },
  { id: 'search-ticket', label: 'Search Ticket', icon: Search, href: ROUTES.TICKETS },
  { id: 'add-rider', label: 'Add Rider', icon: UserPlus, href: ROUTES.CUSTOMERS },
  { id: 'add-vehicle', label: 'Add Vehicle', icon: Truck, href: ROUTES.VEHICLES },
  { id: 'add-part-request', label: 'Add Part Request', icon: PackagePlus, href: ROUTES.PARTS },
  { id: 'reports', label: 'Reports', icon: TrendingUp, href: ROUTES.REPORTS },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const requestRef = useRef(0);
  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [period, setPeriod] = useState<Period>('TODAY');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(
    () => computeRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const loadDashboard = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await dashboardService.getSummary(range);
      if (requestId !== requestRef.current) return;
      setDashboard(response);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setErrorMessage(toApiErrorMessage(error));
      setDashboard(null);
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [range]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleExport = () => {
    if (!dashboard) return;
    const rows = [
      ['Metric', 'Value'],
      ['Open Tickets', String(dashboard.openTickets.value)],
      ['Closed Tickets', String(dashboard.closedTickets.value)],
      ['In Progress', String(dashboard.inProgress.value)],
      ['Waiting for Parts', String(dashboard.waitingForParts.value)],
      ['Service Loss (Selected Period)', String(dashboard.serviceLossToday.value)],
      ['SLA Compliance %', String(dashboard.slaCompliance.withinSlaPct)],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dashboard-summary-${toDateInputValue(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {getGreeting()}, {user?.name ?? 'there'}! 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Here&apos;s what&apos;s happening with your fleet today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm">
            {new Intl.DateTimeFormat('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(new Date())}
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={!dashboard}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.key}
            size="sm"
            variant={period === option.key ? 'primary' : 'outline'}
            onClick={() => setPeriod(option.key)}
          >
            {option.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={period === 'CUSTOM' ? 'primary' : 'outline'}
          onClick={() => setPeriod('CUSTOM')}
        >
          Custom
        </Button>
        {period === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              aria-label="From date"
            />
            <Input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              aria-label="To date"
            />
          </div>
        )}
      </div>

      {errorMessage !== '' && (
        <ErrorState title="Unable to load dashboard" message={errorMessage} />
      )}

      {loading && !dashboard ? (
        <Loader label="Loading dashboard..." />
      ) : !dashboard ? (
        <EmptyState
          title="No dashboard data available"
          description="Dashboard data is currently unavailable."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <KpiSparkCard
              title="Open Tickets"
              value={String(dashboard.openTickets.value)}
              deltaVsYesterdayPct={dashboard.openTickets.deltaVsYesterdayPct}
              sparkline={dashboard.openTickets.sparkline}
              icon={ClipboardList}
              accentColor="#3b82f6"
            />
            <KpiSparkCard
              title="Closed Tickets"
              value={String(dashboard.closedTickets.value)}
              deltaVsYesterdayPct={dashboard.closedTickets.deltaVsYesterdayPct}
              sparkline={dashboard.closedTickets.sparkline}
              icon={CheckCircle2}
              accentColor="#10b981"
            />
            <KpiSparkCard
              title="In Progress"
              value={String(dashboard.inProgress.value)}
              deltaVsYesterdayPct={dashboard.inProgress.deltaVsYesterdayPct}
              sparkline={dashboard.inProgress.sparkline}
              icon={Wrench}
              accentColor="#f59e0b"
            />
            <KpiSparkCard
              title="Waiting for Parts"
              value={String(dashboard.waitingForParts.value)}
              deltaVsYesterdayPct={dashboard.waitingForParts.deltaVsYesterdayPct}
              sparkline={dashboard.waitingForParts.sparkline}
              icon={Settings2}
              accentColor="#ef4444"
            />
            <KpiSparkCard
              title="Service Loss (Today)"
              value={`₹${dashboard.serviceLossToday.value.toLocaleString('en-IN')}`}
              deltaVsYesterdayPct={dashboard.serviceLossToday.deltaVsYesterdayPct}
              sparkline={dashboard.serviceLossToday.sparkline}
              icon={IndianRupee}
              accentColor="#8b5cf6"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card padding="md">
              <CardHeader className="mb-3">
                <CardTitle>SLA Compliance</CardTitle>
              </CardHeader>
              <SlaComplianceDonut {...dashboard.slaCompliance} />
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS)}
                className="mt-4 text-sm font-medium text-primary hover:underline dark:text-blue-400"
              >
                View Details →
              </button>
            </Card>

            <Card padding="md">
              <CardHeader className="mb-3">
                <CardTitle>Tickets Trend (7 Days)</CardTitle>
              </CardHeader>
              <div className="h-56">
                <TicketsTrendChart data={dashboard.ticketsTrend} />
              </div>
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS)}
                className="mt-2 text-sm font-medium text-primary hover:underline dark:text-blue-400"
              >
                View Trend →
              </button>
            </Card>

            <Card padding="md">
              <CardHeader className="mb-3">
                <CardTitle>Top 5 Hubs by Open Tickets</CardTitle>
              </CardHeader>
              <div className="h-56">
                <TopHubsChart data={dashboard.topHubs} />
              </div>
              <button
                type="button"
                onClick={() => navigate(ROUTES.VEHICLES)}
                className="mt-2 text-sm font-medium text-primary hover:underline dark:text-blue-400"
              >
                View All →
              </button>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card padding="md">
              <CardHeader className="mb-3">
                <CardTitle>Recent Critical Tickets</CardTitle>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.TICKETS)}
                  className="text-sm font-medium text-primary hover:underline dark:text-blue-400"
                >
                  View All →
                </button>
              </CardHeader>
              {dashboard.recentCriticalTickets.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No more critical tickets
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {dashboard.recentCriticalTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.TICKETS)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left transition-colors hover:border-danger/20 hover:bg-danger/10 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-red-900/50 dark:hover:bg-red-900/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 font-semibold text-primary dark:text-blue-300">
                            <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                            {ticket.ticketNumber}
                          </span>
                          <Badge variant={ticket.priority === 'CRITICAL' ? 'danger' : 'warning'}>
                            {priorityLabel(ticket.priority)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                          {ticket.category}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(ticket.createdAt)}
                          {ticket.hub ? ` · ${ticket.hub}` : ''}
                          {ticket.vehicleNumber ? ` · ${ticket.vehicleNumber}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padding="md">
              <CardHeader className="mb-3">
                <CardTitle>Today&apos;s Activities</CardTitle>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.REPORTS)}
                  className="text-sm font-medium text-primary hover:underline dark:text-blue-400"
                >
                  View All →
                </button>
              </CardHeader>
              <ul className="space-y-3">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <span className="rounded-lg bg-primary/10 p-1.5 text-primary dark:bg-blue-900/30 dark:text-blue-300">
                      <FileText className="h-4 w-4" />
                    </span>
                    Tickets Created
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {dashboard.todaysActivities.created}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <span className="rounded-lg bg-warning/10 p-1.5 text-warning dark:bg-amber-900/30 dark:text-amber-300">
                      <Wrench className="h-4 w-4" />
                    </span>
                    Tickets Updated
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {dashboard.todaysActivities.updated}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <span className="rounded-lg bg-success/10 p-1.5 text-success dark:bg-emerald-900/30 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    Tickets Resolved
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {dashboard.todaysActivities.resolved}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <span className="rounded-lg bg-purple-100 p-1.5 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                      <TicketCheck className="h-4 w-4" />
                    </span>
                    RFD Marked
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {dashboard.todaysActivities.rfdMarked}
                  </span>
                </li>
              </ul>
            </Card>

            <Card padding="md">
              <CardHeader className="mb-3">
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => navigate(action.href)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-center transition-colors hover:border-primary/30 hover:bg-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-900/20"
                  >
                    <action.icon className="h-5 w-5 text-primary dark:text-blue-400" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
