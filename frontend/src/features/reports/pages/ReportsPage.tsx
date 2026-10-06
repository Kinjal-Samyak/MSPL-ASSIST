import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState, Loader } from '@/components/feedback';
import { Button } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  reportService,
  type ExecutiveDashboardResponse,
  type ReportDashboardResponse,
  type ReportExportFormat,
  type ReportFilterQuery,
  type ReportTabKey,
} from '@/services/reportService';
import {
  ReportCharts,
  ReportDashboard,
  ReportExportToolbar,
  ReportFilters,
  ReportTable,
  ReportViewer,
} from '../components';
import type { ReportsFilterState, ReportsSortState } from '../types/report.types';

const PAGE_SIZE = 10;

const TAB_OPTIONS: Array<{ key: ReportTabKey; label: string }> = [
  { key: 'tickets', label: 'Ticket Analytics' },
  { key: 'customers', label: 'Rider Analytics' },
  { key: 'vehicles', label: 'Vehicle Analytics' },
  { key: 'deployments', label: 'Deployment Analytics' },
  { key: 'workshop', label: 'Workshop Analytics' },
  { key: 'notifications', label: 'Notification Analytics' },
  { key: 'admin', label: 'Admin Analytics' },
];

const DEFAULT_FILTERS: ReportsFilterState = {
  search: '',
  dateFrom: '',
  dateTo: '',
  hubId: '',
  vehicleModelId: '',
  vehicle: '',
  technicianId: '',
  customerId: '',
  rider: '',
  status: '',
  category: '',
};

const DEFAULT_SORT: ReportsSortState = {
  key: 'createdAt',
  direction: 'desc',
};

function toQuery(
  filters: ReportsFilterState,
  sortState: ReportsSortState
): Omit<ReportFilterQuery, 'page' | 'pageSize'> {
  return {
    search: filters.search.trim() || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    hubId: filters.hubId.trim() || undefined,
    vehicleModelId: filters.vehicleModelId.trim() || undefined,
    vehicle: filters.vehicle.trim() || undefined,
    technicianId: filters.technicianId.trim() || undefined,
    customerId: filters.customerId.trim() || undefined,
    rider: filters.rider.trim() || undefined,
    status: filters.status.trim() || undefined,
    category: filters.category.trim() || undefined,
    sortBy: sortState.key,
    sortOrder: sortState.direction,
  };
}

export function ReportsPage() {
  const dashboardRequestRef = useRef(0);
  const listRequestRef = useRef(0);

  const [activeTab, setActiveTab] = useState<ReportTabKey>('tickets');
  const [filters, setFilters] = useState<ReportsFilterState>(DEFAULT_FILTERS);
  const [sortState] = useState<ReportsSortState>(DEFAULT_SORT);
  const [page] = useState(1);

  const [dashboard, setDashboard] = useState<ReportDashboardResponse | null>(null);
  const [executive, setExecutive] = useState<ExecutiveDashboardResponse | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...toQuery(filters, sortState),
    }),
    [filters, page, sortState]
  );

  const refreshDashboard = useCallback(async () => {
    const requestId = ++dashboardRequestRef.current;
    try {
      const [dashboardResult, executiveResult] = await Promise.all([
        reportService.getDashboard(),
        reportService.getExecutiveDashboard(toQuery(filters, sortState)),
      ]);
      if (requestId !== dashboardRequestRef.current) return;
      setDashboard(dashboardResult);
      setExecutive(executiveResult);
    } catch (error) {
      if (requestId !== dashboardRequestRef.current) return;
      setErrorMessage(toApiErrorMessage(error));
    }
  }, [filters, sortState]);

  const refreshList = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setLoading(true);
    setErrorMessage('');
    try {
      const list = await reportService.getReportList<Record<string, unknown>>(activeTab, query);
      if (requestId !== listRequestRef.current) return;
      setRows(list.items);
      setListTotal(list.totalRecords);
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      setErrorMessage(toApiErrorMessage(error));
      setRows([]);
      setListTotal(0);
    } finally {
      if (requestId === listRequestRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, query]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const handleExport = useCallback(
    async (format: ReportExportFormat) => {
      setExporting(true);
      setErrorMessage('');
      try {
        const file = await reportService.exportReport(activeTab, format, query);
        const blob = new Blob([file.content], { type: file.contentType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (error) {
        setErrorMessage(toApiErrorMessage(error));
      } finally {
        setExporting(false);
      }
    },
    [activeTab, query]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Executive dashboard and report center powered by backend APIs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => {
            void refreshDashboard();
            void refreshList();
          }}
        >
          Refresh
        </Button>
      </div>

      {errorMessage !== '' && <ErrorState title="Unable to load reports" message={errorMessage} />}

      <ReportDashboard dashboard={dashboard} executive={executive} />
      <ReportCharts executive={executive} />

      <ReportFilters
        filters={filters}
        onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
      <ReportViewer activeTab={activeTab} tabs={TAB_OPTIONS} onTabChange={setActiveTab} />
      <ReportExportToolbar exporting={exporting} onExport={(format) => void handleExport(format)} />

      {loading ? (
        <Loader label="Loading report data..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No records found"
          description="Try adjusting filters to widen results."
        />
      ) : (
        <ReportTable
          title={`${TAB_OPTIONS.find((tab) => tab.key === activeTab)?.label ?? 'Report'} (${listTotal})`}
          rows={rows}
          loading={loading}
        />
      )}
    </div>
  );
}
