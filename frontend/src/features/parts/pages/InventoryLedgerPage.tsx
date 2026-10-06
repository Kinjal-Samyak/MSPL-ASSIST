import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { toApiErrorMessage } from '@/services/apiService';
import { adminService, type AdminHub } from '@/services/adminService';
import {
  partsService,
  type ConsumptionGroupBy,
  type ConsumptionSummaryPoint,
  type PartInventoryTransaction,
  type PartTransactionType,
} from '@/services/partsService';
import { ConsumptionBarChart } from '@/features/parts/components/ConsumptionBarChart';
import { MonthlyConsumptionChart } from '@/features/parts/components/MonthlyConsumptionChart';

type Metric = 'quantity' | 'value';

const TRANSACTION_TYPE_OPTIONS: Array<{ value: PartTransactionType; label: string }> = [
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'ISSUE', label: 'Issue' },
  { value: 'RETURN', label: 'Return' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out' },
  { value: 'TRANSFER_IN', label: 'Transfer In' },
  { value: 'WARRANTY_RETURN', label: 'Warranty Return' },
  { value: 'SCRAP', label: 'Scrap' },
];

const TYPE_BADGE_VARIANT: Record<
  PartTransactionType,
  'success' | 'danger' | 'info' | 'warning' | 'default'
> = {
  RECEIPT: 'success',
  ISSUE: 'danger',
  RETURN: 'info',
  ADJUSTMENT: 'warning',
  TRANSFER_OUT: 'default',
  TRANSFER_IN: 'default',
  WARRANTY_RETURN: 'default',
  SCRAP: 'default',
};

const PAGE_SIZE = 20;

interface InventoryLedgerPageProps {
  /** Locks the ledger to one transaction type and hides the type filter - used by the Inventory
   * nav's "Goods Issue" and "Returns" items, which are just this same ledger pre-filtered rather
   * than separate pages. */
  presetTransactionType?: PartTransactionType;
}

const PRESET_COPY: Partial<Record<PartTransactionType, { title: string; description: string }>> = {
  ISSUE: {
    title: 'Goods Issue',
    description: 'Every spare part issued out of stock against an approved job-card request.',
  },
  RETURN: {
    title: 'Returns',
    description:
      'Every spare part returned to stock, whether unused by a Technician or via a Service Engineer correction.',
  },
};

const SUMMARY_DIMENSIONS: Array<{
  groupBy: ConsumptionGroupBy;
  title: string;
  emptyDescription: string;
}> = [
  {
    groupBy: 'PART',
    title: 'Most Consumed Parts',
    emptyDescription: 'Approved spare part requests will show up here.',
  },
  {
    groupBy: 'HUB',
    title: 'Consumption by Hub',
    emptyDescription: 'Tickets without a linked deployment have no hub to show.',
  },
  {
    groupBy: 'VEHICLE_MODEL',
    title: 'Consumption by Vehicle Model',
    emptyDescription: 'Tickets without a linked deployment have no vehicle model to show.',
  },
  {
    groupBy: 'TECHNICIAN',
    title: 'Consumption by Technician',
    emptyDescription: 'Approved spare part requests will show up here.',
  },
];

function formatValue(value: string | null): string {
  if (value == null) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export function InventoryLedgerPage({ presetTransactionType }: InventoryLedgerPageProps = {}) {
  const requestIdRef = useRef(0);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hubId, setHubId] = useState('');
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [metric, setMetric] = useState<Metric>('quantity');

  const [monthly, setMonthly] = useState<ConsumptionSummaryPoint[]>([]);
  const [summaries, setSummaries] = useState<Record<ConsumptionGroupBy, ConsumptionSummaryPoint[]>>(
    {
      MONTH: [],
      PART: [],
      HUB: [],
      VEHICLE_MODEL: [],
      TECHNICIAN: [],
      JOB_CARD: [],
    }
  );
  const [jobCardSearch, setJobCardSearch] = useState('');

  const [transactionType, setTransactionType] = useState<PartTransactionType | ''>(
    presetTransactionType ?? ''
  );
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<PartInventoryTransaction[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService
      .getHubs()
      .then(setHubs)
      .catch(() => setHubs([]));
  }, []);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const summaryFilters = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        hubId: hubId || undefined,
      };
      const [
        monthlyResult,
        partResult,
        hubResult,
        vehicleModelResult,
        technicianResult,
        jobCardResult,
        transactionResult,
      ] = await Promise.all([
        partsService.getConsumptionSummary('MONTH', summaryFilters),
        partsService.getConsumptionSummary('PART', summaryFilters),
        partsService.getConsumptionSummary('HUB', summaryFilters),
        partsService.getConsumptionSummary('VEHICLE_MODEL', summaryFilters),
        partsService.getConsumptionSummary('TECHNICIAN', summaryFilters),
        partsService.getConsumptionSummary('JOB_CARD', summaryFilters),
        partsService.listTransactions({
          page,
          pageSize: PAGE_SIZE,
          transactionType: transactionType || undefined,
          hubId: hubId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      ]);
      if (requestId !== requestIdRef.current) return;
      setMonthly(monthlyResult);
      setSummaries({
        MONTH: monthlyResult,
        PART: partResult,
        HUB: hubResult,
        VEHICLE_MODEL: vehicleModelResult,
        TECHNICIAN: technicianResult,
        JOB_CARD: jobCardResult,
      });
      setTransactions(transactionResult.items);
      setTotalRecords(transactionResult.totalRecords);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(toApiErrorMessage(loadError));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [dateFrom, dateTo, hubId, page, transactionType]);

  useEffect(() => {
    void load();
  }, [load]);

  const jobCardRows = [...summaries.JOB_CARD]
    .filter((row) => row.label.toLowerCase().includes(jobCardSearch.trim().toLowerCase()))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, jobCardSearch.trim() ? 50 : 15);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Inventory</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {presetTransactionType ? PRESET_COPY[presetTransactionType]?.title : 'Inventory Ledger'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {presetTransactionType
              ? PRESET_COPY[presetTransactionType]?.description
              : 'Every stock movement, permanently recorded. Ledger data is only available from when this tracking began - it does not reflect activity from before then.'}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void load()}
          loading={loading}
        >
          Refresh
        </Button>
      </header>

      {error !== '' && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Hub"
            value={hubId}
            onChange={(event) => {
              setHubId(event.target.value);
              setPage(1);
            }}
            placeholder="All hubs"
            options={hubs.map((hub) => ({ value: hub.hubId, label: hub.name }))}
          />
          <Select
            label="Metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
            options={[
              { value: 'quantity', label: 'Quantity' },
              { value: 'value', label: 'Value (₹)' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Monthly Consumption</h2>
        <div className="h-64">
          {loading ? (
            <Loader label="Loading..." />
          ) : (
            <MonthlyConsumptionChart data={monthly} metric={metric} />
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {SUMMARY_DIMENSIONS.map((dimension) => (
          <Card key={dimension.groupBy}>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">{dimension.title}</h2>
            <div className="h-64">
              {loading ? (
                <Loader label="Loading..." />
              ) : (
                <ConsumptionBarChart
                  data={summaries[dimension.groupBy]}
                  metric={metric}
                  emptyTitle="No consumption recorded yet"
                  emptyDescription={dimension.emptyDescription}
                />
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Consumption by Job Card</h2>
          <Input
            aria-label="Search job cards"
            value={jobCardSearch}
            onChange={(event) => setJobCardSearch(event.target.value)}
            placeholder="Search by Job Card Number"
            className="w-64"
          />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Job Card</th>
                <th className="px-4 py-3">Quantity Consumed</th>
                <th className="px-4 py-3">Value Consumed</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                jobCardRows.map((row) => (
                  <tr key={row.key} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-4 py-3 text-slate-900">{row.quantity}</td>
                    <td className="px-4 py-3 text-slate-900">
                      ₹{Math.round(row.value).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              {!loading && !jobCardRows.length && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    {jobCardSearch.trim()
                      ? 'No job cards match your search.'
                      : 'No job cards have consumed spare parts yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Ledger Transactions</h2>
          {!presetTransactionType && (
            <Select
              value={transactionType}
              onChange={(event) => {
                setTransactionType(event.target.value as PartTransactionType | '');
                setPage(1);
              }}
              placeholder="All types"
              options={TRANSACTION_TYPE_OPTIONS}
              className="w-48"
            />
          )}
        </div>
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {[
                  'Date',
                  'Type',
                  'Part',
                  'Qty',
                  'Balance',
                  'Unit Cost',
                  'Value',
                  'Hub',
                  'Job Card',
                  'Technician',
                  'Performed By',
                  'Reason',
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12}>
                    <div className="py-10">
                      <Loader label="Loading transactions..." />
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <EmptyState
                      title="No transactions found"
                      description="Try widening the filters."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                transactions.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_BADGE_VARIANT[row.transactionType]}>
                        {row.transactionType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {row.partCode} - {row.partName}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${row.quantityDelta < 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.balanceAfter}</td>
                    <td className="px-4 py-3 text-slate-700">{formatValue(row.unitCost)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatValue(row.totalValue)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.hubName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.jobCardNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.technicianName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.performedByName}</td>
                    <td className="px-4 py-3 text-slate-700">{row.reason ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination total={totalRecords} page={page} perPage={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
