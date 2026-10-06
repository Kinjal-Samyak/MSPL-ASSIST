import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Pencil,
  Plus,
  Send,
  Truck,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Select } from '@/components/ui';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { ROUTES } from '@/constants';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import {
  procurementService,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/services/procurementService';
import { PurchaseOrderFormModal } from '@/features/inventory/components/PurchaseOrderFormModal';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: PurchaseOrderStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE_VARIANT: Record<
  PurchaseOrderStatus,
  'success' | 'danger' | 'info' | 'warning' | 'neutral'
> = {
  DRAFT: 'neutral',
  ISSUED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await procurementService.listPurchaseOrders({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
      });
      setOrders(result.items);
      setTotalRecords(result.totalRecords);
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpserted = (order: PurchaseOrder) => {
    setOrders((prev) => {
      const exists = prev.some((row) => row.id === order.id);
      return exists ? prev.map((row) => (row.id === order.id ? order : row)) : [order, ...prev];
    });
  };

  const issue = async (order: PurchaseOrder) => {
    setBusyId(order.id);
    try {
      const updated = await procurementService.issuePurchaseOrder(order.id);
      handleUpserted(updated);
      toast.success(`${updated.poNumber} issued.`);
    } catch (issueError) {
      toast.error('Unable to issue purchase order', { description: toApiErrorMessage(issueError) });
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (order: PurchaseOrder) => {
    setBusyId(order.id);
    try {
      const updated = await procurementService.cancelPurchaseOrder(order.id);
      handleUpserted(updated);
      toast.success(`${updated.poNumber} cancelled.`);
    } catch (cancelError) {
      toast.error('Unable to cancel purchase order', {
        description: toApiErrorMessage(cancelError),
      });
    } finally {
      setBusyId(null);
    }
  };

  const downloadPdf = async (order: PurchaseOrder) => {
    setBusyId(order.id);
    try {
      const blob = await procurementService.downloadPurchaseOrderPdf(order.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${order.poNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (pdfError) {
      toast.error('Unable to download purchase order PDF', {
        description: toApiErrorMessage(pdfError),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Inventory &middot; Procurement
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Purchase Orders</h1>
          <p className="mt-2 text-sm text-slate-600">
            Draft, issue, and track purchase orders against suppliers - the system generates these
            itself.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Truck className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.INVENTORY_SUPPLIERS)}
          >
            Manage Suppliers
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingOrder(null);
              setFormOpen(true);
            }}
          >
            New Purchase Order
          </Button>
        </div>
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
          <h2 className="text-sm font-semibold text-slate-900">Purchase Orders</h2>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PurchaseOrderStatus | '');
              setPage(1);
            }}
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            className="w-52"
          />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {['', 'PO #', 'Supplier', 'Status', 'Total', 'Created By', 'Created', ''].map(
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
                  <td colSpan={8}>
                    <div className="py-10">
                      <Loader label="Loading purchase orders..." />
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<FileText className="h-8 w-8" />}
                      title="No purchase orders found"
                      description="Try widening the filters, or create a new purchase order."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((current) => (current === order.id ? null : order.id))
                          }
                          aria-label="Toggle lines"
                          className="text-slate-500 hover:text-slate-900"
                        >
                          {expandedId === order.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{order.poNumber}</td>
                      <td className="px-4 py-3 text-slate-900">{order.supplierName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
                          {order.status.replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        ₹{Number(order.totalValue).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order.createdByName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {order.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setEditingOrder(order);
                                  setFormOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Send className="h-3.5 w-3.5" />}
                                onClick={() => void issue(order)}
                                loading={busyId === order.id}
                              >
                                Issue
                              </Button>
                            </>
                          )}
                          {(order.status === 'DRAFT' || order.status === 'ISSUED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<XCircle className="h-3.5 w-3.5" />}
                              onClick={() => void cancel(order)}
                              loading={busyId === order.id}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Download className="h-3.5 w-3.5" />}
                            onClick={() => void downloadPdf(order)}
                            loading={busyId === order.id}
                          >
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr className="border-t border-slate-100 bg-slate-50">
                        <td colSpan={8} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="pb-1 text-left">Part</th>
                                <th className="pb-1 text-left">Ordered</th>
                                <th className="pb-1 text-left">Received</th>
                                <th className="pb-1 text-left">Unit Cost</th>
                                <th className="pb-1 text-left">Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.lines.map((line) => (
                                <tr key={line.id}>
                                  <td className="py-1 text-slate-800">
                                    {line.partCode} - {line.partName}
                                  </td>
                                  <td className="py-1 text-slate-700">{line.orderedQuantity}</td>
                                  <td className="py-1 text-slate-700">{line.receivedQuantity}</td>
                                  <td className="py-1 text-slate-700">
                                    ₹{Number(line.unitCost).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-1 text-slate-700">
                                    ₹{Number(line.lineTotal).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {order.receipts.length > 0 && (
                            <div className="mt-3 border-t border-slate-200 pt-2">
                              <p className="mb-1 text-xs font-semibold text-slate-500">
                                Received via Inventory Upload
                              </p>
                              <ul className="space-y-0.5 text-xs text-slate-700">
                                {order.receipts.map((receipt) => (
                                  <li key={receipt.uploadId}>
                                    Invoice {receipt.invoiceNumber} &middot;{' '}
                                    {receipt.totalQuantityAdded} units &middot;{' '}
                                    {receipt.uploadedByName} &middot;{' '}
                                    {new Date(receipt.uploadedAt).toLocaleDateString()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination total={totalRecords} page={page} perPage={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </Card>

      <PurchaseOrderFormModal
        purchaseOrder={editingOrder}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleUpserted}
      />
    </div>
  );
}
