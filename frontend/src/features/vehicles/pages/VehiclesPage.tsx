import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  vehicleService,
  type VehicleCurrentDeployment,
  type VehicleDeploymentHistoryResponse,
  type VehicleDetailResponse,
  type VehicleDocumentResponse,
  type VehicleHealthSummaryResponse,
  type VehicleListItem,
  type VehicleServiceHistoryResponse,
  type VehicleStatusSummaryResponse,
  type VehicleTimelineResponse,
} from '@/services/vehicleService';
import { formatDateTime } from '@/utils';
import {
  VehicleDashboard,
  VehicleDetailsDrawer,
  VehicleFilters,
  VehicleTable,
} from '../components';
import type { VehicleFiltersState, VehicleSortState } from '../types/vehicle.types';

const DEFAULT_FILTERS: VehicleFiltersState = {
  search: '',
  status: '',
  hubName: '',
  modelCode: '',
};

const DEFAULT_SORT: VehicleSortState = {
  key: 'updatedAt',
  direction: 'desc',
};

const PAGE_SIZE = 10;

export function VehiclesPage() {
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const [filters, setFilters] = useState<VehicleFiltersState>(DEFAULT_FILTERS);
  const [sortState, setSortState] = useState<VehicleSortState>(DEFAULT_SORT);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [dashboard, setDashboard] = useState({
    totalVehicles: 0,
    availableVehicles: 0,
    deployedVehicles: 0,
    maintenanceVehicles: 0,
    workshopVehicles: 0,
    reservedVehicles: 0,
    inactiveVehicles: 0,
    revenueFleet: 0,
    readyForDeployment: 0,
    downFleet: 0,
    inventoryHold: 0,
    fleetUtilizationPercent: 0,
    availabilityPercent: 0,
    averageDowntimeHours: 0,
    mttrHours: 0,
    vehiclesReadyToday: 0,
    waitingForSpare: 0,
    repairInProgress: 0,
    qualityCheck: 0,
    vehiclesAgingOver72Hours: 0,
    readyForDeploymentBreakdown: { fromInventory: 0, fromService: 0, deployableToday: 0 },
    downFleetBreakdown: {
      inspection: 0,
      waitingForSpare: 0,
      workInProgress: 0,
      readyForDeployment: 0,
    },
    fleetHealth: { score: 0, label: 'Critical' as 'Excellent' | 'Good' | 'Attention' | 'Critical' },
    inventoryHoldBreakdown: { registrationPending: 0, insurancePending: 0, pdiPending: 0 },
  });
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [detail, setDetail] = useState<VehicleDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<VehicleTimelineResponse | null>(null);
  const [currentDeployment, setCurrentDeployment] = useState<VehicleCurrentDeployment | null>(null);
  const [deploymentHistory, setDeploymentHistory] =
    useState<VehicleDeploymentHistoryResponse | null>(null);
  const [serviceHistory, setServiceHistory] = useState<VehicleServiceHistoryResponse | null>(null);
  const [documents, setDocuments] = useState<VehicleDocumentResponse | null>(null);
  const [statusSummary, setStatusSummary] = useState<VehicleStatusSummaryResponse | null>(null);
  const [healthSummary, setHealthSummary] = useState<VehicleHealthSummaryResponse | null>(null);
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

  const loadVehicles = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    setLoadingList(true);
    setListError('');
    try {
      const listQuery = {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: filters.status || undefined,
        hubName: filters.hubName.trim() || undefined,
        modelCode: filters.modelCode.trim() || undefined,
        sortBy: sortState.key,
        sortOrder: sortState.direction,
      };

      const hasSearchOrFilters = Boolean(
        listQuery.search || listQuery.status || listQuery.hubName || listQuery.modelCode
      );

      const [dashboardData, listData] = await Promise.all([
        // Dashboard cards always represent the complete inventory. Filters
        // apply only to the table so selecting one status cannot rewrite all
        // of the status totals or make Total look like the selected subset.
        vehicleService.getDashboard(),
        hasSearchOrFilters
          ? vehicleService.searchVehicles(listQuery)
          : vehicleService.getVehicles(listQuery),
      ]);

      if (requestId !== listRequestIdRef.current) return;

      const rows = listData.items.map((item) => ({
        ...item,
        updatedAt: formatDateTime(item.updatedAt),
      }));

      setDashboard({
        totalVehicles: dashboardData.totalVehicles,
        availableVehicles: dashboardData.availableVehicles,
        deployedVehicles: dashboardData.deployedVehicles,
        maintenanceVehicles: dashboardData.maintenanceVehicles,
        workshopVehicles: dashboardData.workshopVehicles,
        reservedVehicles: dashboardData.reservedVehicles,
        inactiveVehicles: dashboardData.inactiveVehicles,
        revenueFleet: dashboardData.revenueFleet,
        readyForDeployment: dashboardData.readyForDeployment,
        downFleet: dashboardData.downFleet,
        inventoryHold: dashboardData.inventoryHold,
        fleetUtilizationPercent: dashboardData.fleetUtilizationPercent,
        availabilityPercent: dashboardData.availabilityPercent,
        averageDowntimeHours: dashboardData.averageDowntimeHours,
        mttrHours: dashboardData.mttrHours,
        vehiclesReadyToday: dashboardData.vehiclesReadyToday,
        waitingForSpare: dashboardData.waitingForSpare,
        repairInProgress: dashboardData.repairInProgress,
        qualityCheck: dashboardData.qualityCheck,
        vehiclesAgingOver72Hours: dashboardData.vehiclesAgingOver72Hours,
        readyForDeploymentBreakdown: dashboardData.readyForDeploymentBreakdown,
        downFleetBreakdown: dashboardData.downFleetBreakdown,
        fleetHealth: dashboardData.fleetHealth,
        inventoryHoldBreakdown: dashboardData.inventoryHoldBreakdown,
      });
      setVehicles(rows);
      setTotalRecords(listData.totalRecords);

      if (rows.length === 0) {
        setSelectedVehicleId(null);
        setIsDetailsOpen(false);
      } else if (!selectedVehicleId || !rows.some((row) => row.vehicleId === selectedVehicleId)) {
        setSelectedVehicleId(rows[0].vehicleId);
      }
    } catch (error) {
      if (requestId !== listRequestIdRef.current) return;
      setListError(toApiErrorMessage(error));
      setVehicles([]);
      setTotalRecords(0);
      setSelectedVehicleId(null);
      setIsDetailsOpen(false);
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoadingList(false);
      }
    }
  }, [
    debouncedSearch,
    filters.hubName,
    filters.modelCode,
    filters.status,
    page,
    selectedVehicleId,
    sortState.direction,
    sortState.key,
  ]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const loadVehicleDetail = useCallback(async (vehicleId: string) => {
    const requestId = ++detailRequestIdRef.current;
    setLoadingDetail(true);
    setDetailError('');
    try {
      const [
        detailData,
        timelineData,
        currentData,
        historyData,
        serviceData,
        documentData,
        statusData,
        healthData,
      ] = await Promise.all([
        vehicleService.getVehicleById(vehicleId),
        vehicleService.getTimeline(vehicleId, { page: 1, pageSize: 20 }),
        vehicleService.getCurrentDeployment(vehicleId),
        vehicleService.getDeploymentHistory(vehicleId, { page: 1, pageSize: 20 }),
        vehicleService.getServiceHistory(vehicleId, { page: 1, pageSize: 20 }),
        vehicleService.getDocuments(vehicleId, { page: 1, pageSize: 20 }),
        vehicleService.getStatusSummary(vehicleId),
        vehicleService.getHealthSummary(vehicleId),
      ]);

      if (requestId !== detailRequestIdRef.current) return;

      setDetail(detailData);
      setTimeline(timelineData);
      setCurrentDeployment(currentData);
      setDeploymentHistory(historyData);
      setServiceHistory(serviceData);
      setDocuments(documentData);
      setStatusSummary(statusData);
      setHealthSummary(healthData);
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) return;
      setDetailError(toApiErrorMessage(error));
      setDetail(null);
      setTimeline(null);
      setCurrentDeployment(null);
      setDeploymentHistory(null);
      setServiceHistory(null);
      setDocuments(null);
      setStatusSummary(null);
      setHealthSummary(null);
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedVehicleId || !isDetailsOpen) return;
    void loadVehicleDetail(selectedVehicleId);
  }, [isDetailsOpen, loadVehicleDetail, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((item) => item.vehicleId === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles]
  );

  const handleActivate = async () => {
    if (!selectedVehicleId) return;
    setSaving(true);
    setActionError('');
    try {
      const result = await vehicleService.activateVehicle(selectedVehicleId);
      setSuccessMessage(`Vehicle ${result.vehicleNumber} activated successfully.`);
      await loadVehicles();
      await loadVehicleDetail(selectedVehicleId);
    } catch (error) {
      setActionError(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedVehicleId) return;
    setSaving(true);
    setActionError('');
    try {
      const result = await vehicleService.deactivateVehicle(selectedVehicleId);
      setSuccessMessage(`Vehicle ${result.vehicleNumber} deactivated successfully.`);
      await loadVehicles();
      await loadVehicleDetail(selectedVehicleId);
    } catch (error) {
      setActionError(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Fleet Operations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Revenue fleet, availability, downtime and asset operations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadVehicles()}
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

      <VehicleDashboard
        totalVehicles={dashboard.totalVehicles}
        availableVehicles={dashboard.availableVehicles}
        deployedVehicles={dashboard.deployedVehicles}
        maintenanceVehicles={dashboard.maintenanceVehicles}
        workshopVehicles={dashboard.workshopVehicles}
        reservedVehicles={dashboard.reservedVehicles}
        inactiveVehicles={dashboard.inactiveVehicles}
        revenueFleet={dashboard.revenueFleet}
        readyForDeployment={dashboard.readyForDeployment}
        downFleet={dashboard.downFleet}
        inventoryHold={dashboard.inventoryHold}
        fleetUtilizationPercent={dashboard.fleetUtilizationPercent}
        availabilityPercent={dashboard.availabilityPercent}
        averageDowntimeHours={dashboard.averageDowntimeHours}
        mttrHours={dashboard.mttrHours}
        vehiclesReadyToday={dashboard.vehiclesReadyToday}
        waitingForSpare={dashboard.waitingForSpare}
        repairInProgress={dashboard.repairInProgress}
        qualityCheck={dashboard.qualityCheck}
        vehiclesAgingOver72Hours={dashboard.vehiclesAgingOver72Hours}
        readyForDeploymentBreakdown={dashboard.readyForDeploymentBreakdown}
        downFleetBreakdown={dashboard.downFleetBreakdown}
        fleetHealth={dashboard.fleetHealth}
        inventoryHoldBreakdown={dashboard.inventoryHoldBreakdown}
      />

      <VehicleFilters
        filters={filters}
        onChange={(updates) => {
          setFilters((current) => ({ ...current, ...updates }));
          setPage(1);
        }}
      />

      <VehicleTable
        rows={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(vehicle) => {
          setSelectedVehicleId(vehicle.vehicleId);
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

      <VehicleDetailsDrawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        loading={loadingDetail}
        error={detailError}
        detail={detail}
        timeline={timeline}
        currentDeployment={currentDeployment}
        deploymentHistory={deploymentHistory}
        serviceHistory={serviceHistory}
        documents={documents}
        statusSummary={statusSummary}
        healthSummary={healthSummary}
        onRetry={() => {
          if (!selectedVehicleId) return;
          void loadVehicleDetail(selectedVehicleId);
        }}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        saving={saving}
      />

      {selectedVehicle && !isDetailsOpen && (
        <Button variant="secondary" size="sm" onClick={() => setIsDetailsOpen(true)}>
          Open {selectedVehicle.vehicleNumber} details
        </Button>
      )}
    </div>
  );
}
