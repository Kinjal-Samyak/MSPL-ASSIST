import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Layers,
  Package,
  PackagePlus,
  PackageSearch,
  Pencil,
  RefreshCw,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatCard, type StatCardTone } from '@/components/ui';
import { ROUTES } from '@/constants';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { partsService, type Part, type PartCategory } from '@/services/partsService';
import { lookupService, type VehicleModelLookupResponse } from '@/services/lookupService';
import { AdjustStockModal } from '@/features/parts/components/AdjustStockModal';

export function PartsPage() {
  const navigate = useNavigate();
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModelLookupResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editModelCodes, setEditModelCodes] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);

  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [catalog, categoryList, modelList] = await Promise.all([
        partsService.listCatalog({ search: search || undefined, active: true }),
        partsService.listCategories(),
        lookupService.getVehicleModels(),
      ]);
      setParts(catalog);
      setCategories(categoryList);
      setVehicleModels(modelList);
    } catch {
      setError('Unable to load the Parts catalogue. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const startEdit = (part: Part) => {
    setEditingPartId(part.id);
    setEditCategoryId(part.category.id);
    setEditModelCodes(new Set(part.compatibleModels.map((model) => model.modelCode)));
  };

  const cancelEdit = () => {
    setEditingPartId(null);
    setEditCategoryId('');
    setEditModelCodes(new Set());
  };

  const toggleEditModel = (modelCode: string) => {
    setEditModelCodes((current) => {
      const next = new Set(current);
      if (next.has(modelCode)) next.delete(modelCode);
      else next.add(modelCode);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editingPartId) return;
    setSavingEdit(true);
    try {
      const compatibleModels = vehicleModels
        .filter((model) => editModelCodes.has(model.modelCode))
        .map((model) => ({ modelCode: model.modelCode, modelName: model.displayName }));
      const updated = await partsService.updatePartCategory(editingPartId, {
        categoryId: editCategoryId,
        compatibleModels,
      });
      setParts((current) => current.map((part) => (part.id === updated.id ? updated : part)));
      toast.success('Part updated successfully.');
      cancelEdit();
    } catch (saveError) {
      toast.error('Unable to update part', { description: toApiErrorMessage(saveError) });
    } finally {
      setSavingEdit(false);
    }
  };
  const value = useMemo(
    () => parts.reduce((total, part) => total + Number(part.partCost || 0), 0),
    [parts]
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Parts module
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Parts Catalogue</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage the Parts Master catalogue and inventory stock receipts. Reservations, stock
            issue, and transactions are not part of this release.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            leftIcon={<Boxes className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.PARTS_INVENTORY_LEDGER)}
          >
            Inventory Ledger
          </Button>
          <Button
            variant="outline"
            leftIcon={<PackagePlus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.PARTS_INVENTORY_IMPORT)}
          >
            Parts Inventory Import
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void load()}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Active Parts" value={parts.length} icon={Package} tone="blue" />
        <Metric label="Categories" value={categories.length} icon={Layers} tone="violet" />
        <Metric
          label="Catalogue Value Reference"
          value={`₹${value.toLocaleString('en-IN')}`}
          icon={Wallet}
          tone="emerald"
        />
      </div>
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-64 flex-1">
            <PackageSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              aria-label="Search parts catalogue"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
              placeholder="Search by Part Code or Part Name"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <Button onClick={() => void load()}>Search</Button>
        </div>
      </Card>
      <Card padding="none">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {[
                  'Part Code',
                  'Part Name',
                  'Category',
                  'Available Qty',
                  'Part Cost',
                  'Compatibility',
                  'Status',
                  'Actions',
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading &&
                parts.map((part) => {
                  const isEditing = editingPartId === part.id;
                  return (
                    <tr key={part.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold text-slate-900">{part.partCode}</td>
                      <td className="px-4 py-3 text-slate-900">{part.partName}</td>
                      <td className="px-4 py-3 text-slate-900">
                        {isEditing ? (
                          <select
                            aria-label="Category"
                            value={editCategoryId}
                            onChange={(event) => setEditCategoryId(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          part.category.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{part.availableQuantity}</td>
                      <td className="px-4 py-3 text-slate-900">
                        ₹{Number(part.partCost).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {isEditing ? (
                          <div className="max-h-32 w-56 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-2">
                            {vehicleModels.map((model) => (
                              <label
                                key={model.modelCode}
                                className="flex cursor-pointer items-center gap-2 text-xs text-slate-900"
                              >
                                <input
                                  type="checkbox"
                                  checked={editModelCodes.has(model.modelCode)}
                                  onChange={() => toggleEditModel(model.modelCode)}
                                />
                                {model.displayName}
                              </label>
                            ))}
                            {!vehicleModels.length && (
                              <p className="text-xs text-slate-400">No vehicle models found.</p>
                            )}
                          </div>
                        ) : (
                          part.compatibleModels.map((model) => model.modelCode).join(', ') ||
                          'All models'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => void saveEdit()} loading={savingEdit}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={savingEdit}
                              aria-label="Cancel edit"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(part)}
                              aria-label={`Edit ${part.partName}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAdjustingPart(part)}
                              aria-label={`Adjust stock for ${part.partName}`}
                            >
                              <Boxes className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {!loading && !parts.length && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    No parts match the current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <AdjustStockModal
        part={adjustingPart}
        onClose={() => setAdjustingPart(null)}
        onSuccess={(result) =>
          setParts((current) =>
            current.map((part) =>
              part.id === result.partId
                ? { ...part, availableQuantity: result.availableQuantity }
                : part
            )
          )
        }
      />
    </div>
  );
}
function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatCardTone;
}) {
  return <StatCard label={label} value={value} icon={icon} tone={tone} />;
}
