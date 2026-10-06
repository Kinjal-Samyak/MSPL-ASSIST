import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, PackagePlus } from 'lucide-react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { EmptyState, Loader } from '@/components/feedback';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { partsService, type Part } from '@/services/partsService';
import { procurementService } from '@/services/procurementService';

type StockLevel = 'OUT_OF_STOCK' | 'BELOW_MINIMUM' | 'BELOW_REORDER' | 'HEALTHY';

function stockLevelOf(part: Part): StockLevel {
  if (part.availableQuantity <= 0) return 'OUT_OF_STOCK';
  if (part.availableQuantity < part.minimumStock) return 'BELOW_MINIMUM';
  if (part.availableQuantity < part.reorderLevel) return 'BELOW_REORDER';
  return 'HEALTHY';
}

const LEVEL_BADGE: Record<
  StockLevel,
  { label: string; variant: 'danger' | 'warning' | 'info' | 'success' }
> = {
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'danger' },
  BELOW_MINIMUM: { label: 'Below Minimum', variant: 'danger' },
  BELOW_REORDER: { label: 'Below Reorder', variant: 'warning' },
  HEALTHY: { label: 'Healthy', variant: 'success' },
};

export function CentralInventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [raisingPartId, setRaisingPartId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    partsService
      .listCatalog({ active: true })
      .then(setParts)
      .catch((loadError) => setError(toApiErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return parts
      .filter(
        (part) =>
          !term ||
          part.partCode.toLowerCase().includes(term) ||
          part.partName.toLowerCase().includes(term)
      )
      .filter((part) => !lowStockOnly || stockLevelOf(part) !== 'HEALTHY')
      .sort((a, b) => a.partCode.localeCompare(b.partCode));
  }, [parts, search, lowStockOnly]);

  const lowStockCount = parts.filter((part) => stockLevelOf(part) !== 'HEALTHY').length;

  const raiseRequest = async (part: Part) => {
    setRaisingPartId(part.id);
    try {
      const quantity = Math.max(part.reorderLevel - part.availableQuantity, part.minimumStock, 1);
      const request = await procurementService.createProcurementRequest({
        partId: part.id,
        requestedQuantity: quantity,
        reason: 'LOW_STOCK',
      });
      toast.success(`Procurement request ${request.requestNumber} raised for ${part.partCode}.`);
    } catch (raiseError) {
      toast.error('Unable to raise procurement request', {
        description: toApiErrorMessage(raiseError),
      });
    } finally {
      setRaisingPartId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Inventory</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Central Inventory</h1>
        <p className="mt-2 text-sm text-slate-600">
          Live stock levels against each part&apos;s minimum, reorder, and maximum thresholds.
        </p>
      </header>

      {error !== '' && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <Input
            aria-label="Search parts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code or name"
            className="w-64"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => setLowStockOnly(event.target.checked)}
            />
            Low stock only ({lowStockCount})
          </label>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {['Part', 'Available', 'Minimum', 'Reorder Level', 'Maximum', 'Status', ''].map(
                  (label) => (
                    <th key={label} className="px-4 py-3">
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-10">
                      <Loader label="Loading stock levels..." />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Boxes className="h-8 w-8" />}
                      title="No parts found"
                      description="Try widening the filters."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                rows.map((part) => {
                  const level = stockLevelOf(part);
                  const badge = LEVEL_BADGE[level];
                  return (
                    <tr key={part.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-900">
                        {part.partCode} - {part.partName}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {part.availableQuantity}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{part.minimumStock}</td>
                      <td className="px-4 py-3 text-slate-700">{part.reorderLevel}</td>
                      <td className="px-4 py-3 text-slate-700">{part.maximumStock ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {level !== 'HEALTHY' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<PackagePlus className="h-3.5 w-3.5" />}
                            onClick={() => void raiseRequest(part)}
                            loading={raisingPartId === part.id}
                          >
                            Raise Request
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lowStockCount} part{lowStockCount === 1 ? '' : 's'} below its reorder threshold. Raise a
          procurement request to restock.
        </div>
      )}
    </div>
  );
}
