import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  customerService,
  type CustomerDocumentResponse,
  type CustomerDetailResponse,
  type CustomerListItem,
  type CustomerMutationPayload,
  type CustomerRentalHistoryItem,
  type CustomerRentalHistoryResponse,
  type CustomerTimelineResponse,
} from '@/services/customerService';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/utils';
import {
  CustomerDashboard,
  CustomerDetailsPanel,
  CustomerFilters,
  CustomerFormModal,
  CustomerTable,
  DeactivateCustomerModal,
} from '../components';
import type { CustomerFiltersState, CustomerSortState } from '../types/customer.types';

const DEFAULT_FILTERS: CustomerFiltersState = {
  search: '',
  status: '',
};

const DEFAULT_SORT: CustomerSortState = {
  key: 'updatedAt',
  direction: 'desc',
};

const PAGE_SIZE = 10;

export function CustomersPage() {
  const user = useAuthStore((state) => state.user);
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const [filters, setFilters] = useState<CustomerFiltersState>(DEFAULT_FILTERS);
  const [sortState, setSortState] = useState<CustomerSortState>(DEFAULT_SORT);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [customerDetail, setCustomerDetail] = useState<CustomerDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<CustomerTimelineResponse | null>(null);
  const [rentalHistory, setRentalHistory] = useState<CustomerRentalHistoryResponse | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<CustomerRentalHistoryItem[]>([]);
  const [documents, setDocuments] = useState<CustomerDocumentResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
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

  const loadCustomers = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    setLoadingList(true);
    setListError('');
    try {
      const response = await customerService.getCustomers({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: filters.status || undefined,
        sortBy: sortState.key,
        sortOrder: sortState.direction,
        viewerRole: user?.role,
        viewerUserId: user?.id,
      });

      const normalizedItems = response.items.map((item) => ({
        ...item,
        createdAt: formatDateTime(item.createdAt),
        updatedAt: formatDateTime(item.updatedAt),
      }));
      if (requestId !== listRequestIdRef.current) {
        return;
      }

      setCustomers(normalizedItems);
      setTotalRecords(response.totalRecords);
      setStatusCounts(response.statusCounts);

      if (normalizedItems.length === 0) {
        setSelectedCustomerId(null);
        setCustomerDetail(null);
        setTimeline(null);
        setRentalHistory(null);
        setActiveVehicles([]);
        setDocuments(null);
      } else if (
        !selectedCustomerId ||
        !normalizedItems.some((item) => item.customerId === selectedCustomerId)
      ) {
        setSelectedCustomerId(normalizedItems[0].customerId);
      }
    } catch (error) {
      if (requestId !== listRequestIdRef.current) {
        return;
      }
      setListError(toApiErrorMessage(error));
      setCustomers([]);
      setTotalRecords(0);
      setStatusCounts({ ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 });
      setSelectedCustomerId(null);
      setCustomerDetail(null);
      setTimeline(null);
      setRentalHistory(null);
      setActiveVehicles([]);
      setDocuments(null);
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoadingList(false);
      }
    }
  }, [
    debouncedSearch,
    filters.status,
    page,
    selectedCustomerId,
    sortState.direction,
    sortState.key,
    user?.id,
    user?.role,
  ]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const loadCustomerDetail = useCallback(
    async (customerId: string) => {
      const requestId = ++detailRequestIdRef.current;
      setLoadingDetail(true);
      setDetailError('');
      try {
        const [detail, timelineData, rentalData, activeVehicleData, documentData] =
          await Promise.all([
            customerService.getCustomerById(customerId, {
              viewerRole: user?.role,
              viewerUserId: user?.id,
            }),
            customerService.getCustomerTimeline(customerId, { page: 1, pageSize: 20 }),
            customerService.getCustomerRentalHistory(customerId, { page: 1, pageSize: 20 }),
            customerService.getCustomerActiveVehicles(customerId),
            customerService.getCustomerDocuments(customerId, { page: 1, pageSize: 20 }),
          ]);
        if (requestId !== detailRequestIdRef.current) {
          return;
        }
        setCustomerDetail(detail);
        setTimeline(timelineData);
        setRentalHistory(rentalData);
        setActiveVehicles(activeVehicleData);
        setDocuments(documentData);
      } catch (error) {
        if (requestId !== detailRequestIdRef.current) {
          return;
        }
        setDetailError(toApiErrorMessage(error));
        setCustomerDetail(null);
        setTimeline(null);
        setRentalHistory(null);
        setActiveVehicles([]);
        setDocuments(null);
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setLoadingDetail(false);
        }
      }
    },
    [user?.id, user?.role]
  );

  useEffect(() => {
    if (!selectedCustomerId) return;
    void loadCustomerDetail(selectedCustomerId);
  }, [loadCustomerDetail, selectedCustomerId]);

  useEffect(() => {
    if (selectedCustomerId) return;
    setLoadingDetail(false);
    setDetailError('');
    setCustomerDetail(null);
    setTimeline(null);
    setRentalHistory(null);
    setActiveVehicles([]);
    setDocuments(null);
  }, [selectedCustomerId]);

  const dashboardStats = useMemo(() => {
    return {
      total: statusCounts.ACTIVE + statusCounts.INACTIVE + statusCounts.SUSPENDED,
      active: statusCounts.ACTIVE,
      inactive: statusCounts.INACTIVE,
      suspended: statusCounts.SUSPENDED,
    };
  }, [statusCounts]);

  const handleCreateOrUpdate = async (payload: CustomerMutationPayload) => {
    setSaving(true);
    setActionError('');
    try {
      if (isEditOpen && selectedCustomerId) {
        const result = await customerService.updateCustomer(selectedCustomerId, payload);
        setSuccessMessage(`Rider ${result.customerName} updated successfully.`);
      } else {
        const result = await customerService.createCustomer({
          customerName: payload.customerName ?? '',
          registeredMobile: payload.registeredMobile ?? '',
          alternateMobile: payload.alternateMobile,
          whatsAppNumber: payload.whatsAppNumber,
          email: payload.email,
          address: payload.address,
        });
        setSuccessMessage(`Rider ${result.customerName} created successfully.`);
      }
      setIsCreateOpen(false);
      setIsEditOpen(false);
      await loadCustomers();
    } catch (error) {
      setActionError(toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (reason: string) => {
    if (!selectedCustomerId) return;
    setSaving(true);
    setActionError('');
    try {
      const result = await customerService.deactivateCustomer(selectedCustomerId, reason);
      setSuccessMessage(`Rider ${result.customerName} deactivated successfully.`);
      setIsDeactivateOpen(false);
      await loadCustomers();
      await loadCustomerDetail(selectedCustomerId);
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
            Riders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage rider records and lifecycle
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
            disabled={user?.role === 'TECHNICIAN'}
          >
            New Rider
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadCustomers()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {successMessage !== '' && (
        <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm text-success dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {listError !== '' && (
        <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {listError}
        </div>
      )}

      <CustomerDashboard
        totalCustomers={dashboardStats.total}
        activeCustomers={dashboardStats.active}
        inactiveCustomers={dashboardStats.inactive}
      />

      <CustomerFilters
        filters={filters}
        onChange={(updates) => {
          setFilters((current) => ({ ...current, ...updates }));
          setPage(1);
        }}
      />

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <CustomerTable
          rows={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(customer) => setSelectedCustomerId(customer.customerId)}
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

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              disabled={!selectedCustomerId || user?.role === 'TECHNICIAN'}
            >
              Edit Rider
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setIsDeactivateOpen(true)}
              disabled={!selectedCustomerId || user?.role === 'TECHNICIAN'}
            >
              Deactivate
            </Button>
          </div>
          <CustomerDetailsPanel
            loading={loadingDetail}
            error={detailError}
            detail={customerDetail}
            timeline={timeline}
            rentalHistory={rentalHistory}
            activeVehicles={activeVehicles}
            documents={documents}
            onRetry={() => {
              if (!selectedCustomerId) return;
              void loadCustomerDetail(selectedCustomerId);
            }}
          />
        </div>
      </section>

      <CustomerFormModal
        isOpen={isCreateOpen}
        mode="create"
        initialCustomer={null}
        loading={saving}
        error={actionError}
        onClose={() => {
          setActionError('');
          setIsCreateOpen(false);
        }}
        onSubmit={handleCreateOrUpdate}
      />

      <CustomerFormModal
        isOpen={isEditOpen}
        mode="edit"
        initialCustomer={customerDetail}
        loading={saving}
        error={actionError}
        onClose={() => {
          setActionError('');
          setIsEditOpen(false);
        }}
        onSubmit={handleCreateOrUpdate}
      />

      <DeactivateCustomerModal
        isOpen={isDeactivateOpen}
        customerName={customerDetail?.customerName ?? 'selected rider'}
        loading={saving}
        error={actionError}
        onClose={() => {
          setActionError('');
          setIsDeactivateOpen(false);
        }}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
