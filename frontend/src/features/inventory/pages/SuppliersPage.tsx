import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Truck } from 'lucide-react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { toApiErrorMessage } from '@/services/apiService';
import { procurementService, type Supplier } from '@/services/procurementService';
import { SupplierFormModal } from '@/features/inventory/components/SupplierFormModal';

const PAGE_SIZE = 20;

export function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await procurementService.listSuppliers({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
      });
      setSuppliers(result.items);
      setTotalRecords(result.totalRecords);
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpserted = (supplier: Supplier) => {
    setSuppliers((prev) => {
      const exists = prev.some((row) => row.id === supplier.id);
      return exists
        ? prev.map((row) => (row.id === supplier.id ? supplier : row))
        : [supplier, ...prev];
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Inventory &middot; Procurement
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Suppliers</h1>
          <p className="mt-2 text-sm text-slate-600">
            The address book Purchase Orders are issued against.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingSupplier(null);
            setFormOpen(true);
          }}
        >
          New Supplier
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

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <Input
            aria-label="Search suppliers"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by code or name"
            className="w-64"
          />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {['Code', 'Name', 'Contact', 'Phone', 'Email', 'GST', 'Status', ''].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-10">
                      <Loader label="Loading suppliers..." />
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Truck className="h-8 w-8" />}
                      title="No suppliers yet"
                      description="Create your first supplier to start issuing purchase orders."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {supplier.supplierCode}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{supplier.name}</td>
                    <td className="px-4 py-3 text-slate-700">{supplier.contactPerson ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{supplier.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{supplier.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{supplier.gstNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={supplier.active ? 'success' : 'neutral'}>
                        {supplier.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
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

      <SupplierFormModal
        supplier={editingSupplier}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleUpserted}
      />
    </div>
  );
}
