import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  deploymentService,
  type DeploymentDetailResponse,
  type DeploymentHistoryResponse,
  type DeploymentListItem,
  type DeploymentPaymentsResponse,
  type DeploymentStatusResponse,
  type DeploymentTimelineResponse,
} from '@/services/deploymentService';
import { formatDateTime } from '@/utils';
import {
  DeploymentDashboard,
  DeploymentDetailsDrawer,
  DeploymentFilters,
  DeploymentTable,
} from '../components';
import type { DeploymentFiltersState, DeploymentSortState } from '../types/deployment.types';

const DEFAULT_FILTERS: DeploymentFiltersState = {
  search: '',
  rentalStatus: '',
  hubName: '',
  modelCode: '',
};

const DEFAULT_SORT: DeploymentSortState = {
  key: 'updatedAt',
  direction: 'desc',
};

const PAGE_SIZE = 10;

export function DeploymentsPage() {
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const [filters, setFilters] = useState<DeploymentFiltersState>(DEFAULT_FILTERS);
  const [sortState, setSortState] = useState<DeploymentSortState>(DEFAULT_SORT);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [dashboard, setDashboard] = useState({
    totalDeployments: 0,
    activeDeployments: 0,
    pendingDeployments: 0,
    completedDeployments: 0,
    maintenanceDeployments: 0,
    deploymentsWithOpenTickets: 0,
  });
  const [deployments, setDeployments] = useState<DeploymentListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [detail, setDetail] = useState<DeploymentDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<DeploymentTimelineResponse | null>(null);
  const [payments, setPayments] = useState<DeploymentPaymentsResponse | null>(null);
  const [history, setHistory] = useState<DeploymentHistoryResponse | null>(null);
  const [status, setStatus] = useState<DeploymentStatusResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    if (successMessage === '') return undefined;
    const timeout = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const loadDeployments = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    setLoadingList(true);
    setListError('');
    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        rentalStatus: filters.rentalStatus || undefined,
        hubName: filters.hubName.trim() || undefined,
        modelCode: filters.modelCode.trim() || undefined,
        sortBy: sortState.key,
        sortOrder: sortState.direction,
      };
      const hasSearchOrFilters = Boolean(
        query.search || query.rentalStatus || query.hubName || query.modelCode
      );
      const [dashboardData, listData] = await Promise.all([
        deploymentService.getDashboard(query),
        hasSearchOrFilters
          ? deploymentService.searchDeployments(query)
          : deploymentService.getDeployments(query),
      ]);

      if (requestId !== listRequestIdRef.current) return;

      const rows = listData.items.map((item) => ({
        ...item,
        startedAt: formatDateTime(item.startedAt),
        updatedAt: formatDateTime(item.updatedAt),
      }));

      setDashboard(dashboardData);
      setDeployments(rows);
      setTotalRecords(listData.totalRecords);

      if (rows.length === 0) {
        setSelectedDeploymentId(null);
        setIsDetailsOpen(false);
      } else if (
        !selectedDeploymentId ||
        !rows.some((row) => row.deploymentId === selectedDeploymentId)
      ) {
        setSelectedDeploymentId(rows[0].deploymentId);
      }
    } catch (error) {
      if (requestId !== listRequestIdRef.current) return;
      setListError(toApiErrorMessage(error));
      setDeployments([]);
      setTotalRecords(0);
      setSelectedDeploymentId(null);
      setIsDetailsOpen(false);
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoadingList(false);
      }
    }
  }, [
    page,
    debouncedSearch,
    filters.rentalStatus,
    filters.hubName,
    filters.modelCode,
    sortState.key,
    sortState.direction,
    selectedDeploymentId,
  ]);

  useEffect(() => {
    void loadDeployments();
  }, [loadDeployments]);

  const loadDeploymentDetail = useCallback(async (deploymentId: string) => {
    const requestId = ++detailRequestIdRef.current;
    setLoadingDetail(true);
    setDetailError('');
    try {
      const [detailData, timelineData, paymentsData, historyData, statusData] = await Promise.all([
        deploymentService.getDeploymentById(deploymentId),
        deploymentService.getTimeline(deploymentId, { page: 1, pageSize: 20 }),
        deploymentService.getPayments(deploymentId, { page: 1, pageSize: 20 }),
        deploymentService.getHistory(deploymentId, { page: 1, pageSize: 20 }),
        deploymentService.getStatus(deploymentId),
      ]);

      if (requestId !== detailRequestIdRef.current) return;
      setDetail(detailData);
      setTimeline(timelineData);
      setPayments(paymentsData);
      setHistory(historyData);
      setStatus(statusData);
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) return;
      setDetailError(toApiErrorMessage(error));
      setDetail(null);
      setTimeline(null);
      setPayments(null);
      setHistory(null);
      setStatus(null);
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedDeploymentId || !isDetailsOpen) return;
    void loadDeploymentDetail(selectedDeploymentId);
  }, [isDetailsOpen, selectedDeploymentId, loadDeploymentDetail]);

  const selectedDeployment = useMemo(
    () => deployments.find((item) => item.deploymentId === selectedDeploymentId) ?? null,
    [deployments, selectedDeploymentId]
  );

  const handleCloseDeployment = async () => {
    if (!selectedDeploymentId) return;
    setSaving(true);
    setActionError('');
    try {
      await deploymentService.closeDeployment(selectedDeploymentId);
      setSuccessMessage(`Deployment ${selectedDeploymentId} close validation passed.`);
      await loadDeployments();
      await loadDeploymentDetail(selectedDeploymentId);
    } catch (error) {
      setActionError(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReopenDeployment = async () => {
    if (!selectedDeploymentId) return;
    setSaving(true);
    setActionError('');
    try {
      await deploymentService.reopenDeployment(selectedDeploymentId);
      setSuccessMessage(`Deployment ${selectedDeploymentId} reopen validation passed.`);
      await loadDeployments();
      await loadDeploymentDetail(selectedDeploymentId);
    } catch (error) {
      setActionError(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deployments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage deployment operations, timeline, payments and status
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadDeployments()}
        >
          Refresh
        </Button>
      </div>

      {successMessage !== '' && (
        <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm text-success dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          {successMessage}
        </div>
      )}
      {(listError !== '' || actionError !== '') && (
        <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {listError || actionError}
        </div>
      )}

      <DeploymentDashboard
        totalDeployments={dashboard.totalDeployments}
        activeDeployments={dashboard.activeDeployments}
        pendingDeployments={dashboard.pendingDeployments}
        completedDeployments={dashboard.completedDeployments}
        maintenanceDeployments={dashboard.maintenanceDeployments}
        deploymentsWithOpenTickets={dashboard.deploymentsWithOpenTickets}
      />

      <DeploymentFilters
        filters={filters}
        onChange={(updates) => {
          setFilters((current) => ({ ...current, ...updates }));
          setPage(1);
        }}
      />

      <DeploymentTable
        rows={deployments}
        selectedDeploymentId={selectedDeploymentId}
        onSelectDeployment={(item) => {
          setSelectedDeploymentId(item.deploymentId);
          setIsDetailsOpen(true);
        }}
        loading={loadingList}
        page={page}
        perPage={PAGE_SIZE}
        total={totalRecords}
        onPageChange={setPage}
        sortState={sortState}
        onSortChange={(nextSort) => {
          setSortState(nextSort);
          setPage(1);
        }}
      />

      <DeploymentDetailsDrawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        loading={loadingDetail}
        error={detailError}
        detail={detail}
        timeline={timeline}
        payments={payments}
        history={history}
        status={status}
        onRetry={() => {
          if (!selectedDeploymentId) return;
          void loadDeploymentDetail(selectedDeploymentId);
        }}
        onCloseDeployment={handleCloseDeployment}
        onReopenDeployment={handleReopenDeployment}
        saving={saving}
      />

      {selectedDeployment && !isDetailsOpen && (
        <Button variant="secondary" size="sm" onClick={() => setIsDetailsOpen(true)}>
          Open {selectedDeployment.deploymentId} details
        </Button>
      )}
    </div>
  );
}
