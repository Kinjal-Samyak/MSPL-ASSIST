import { useEffect, useState } from 'react';
import { AlertTriangle, Boxes, ClipboardList, FileText, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, StatCard } from '@/components/ui';
import { Loader } from '@/components/feedback';
import { ROUTES } from '@/constants';
import { toApiErrorMessage } from '@/services/apiService';
import { partsService } from '@/services/partsService';
import { procurementService } from '@/services/procurementService';
import { ticketService } from '@/services/ticketService';

interface DashboardStats {
  lowStockParts: number;
  pendingRequisitions: number;
  pendingProcurementRequests: number;
  openPurchaseOrders: number;
}

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      partsService.listCatalog({ active: true }),
      ticketService.listAllSparePartRequests({ page: 1, pageSize: 1, status: 'PENDING' }),
      procurementService.listProcurementRequests({ page: 1, pageSize: 1, status: 'PENDING' }),
      procurementService.listPurchaseOrders({ page: 1, pageSize: 1, status: 'ISSUED' }),
      procurementService.listPurchaseOrders({ page: 1, pageSize: 1, status: 'PARTIALLY_RECEIVED' }),
    ])
      .then(([parts, pendingRequisitions, pendingRequests, issuedOrders, partialOrders]) => {
        setStats({
          lowStockParts: parts.filter((part) => part.availableQuantity < part.reorderLevel).length,
          pendingRequisitions: pendingRequisitions.totalRecords,
          pendingProcurementRequests: pendingRequests.totalRecords,
          openPurchaseOrders: issuedOrders.totalRecords + partialOrders.totalRecords,
        });
      })
      .catch((loadError) => setError(toApiErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Inventory</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Inventory Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Where your spare parts are, right now: stock health, pending approvals, and open orders.
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

      {loading || !stats ? (
        <Card>
          <Loader label="Loading dashboard..." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Parts Below Reorder Level"
            value={stats.lowStockParts}
            icon={AlertTriangle}
            tone="rose"
            onClick={() => navigate(ROUTES.INVENTORY_CENTRAL)}
          />
          <StatCard
            label="Pending Spare Part Requisitions"
            value={stats.pendingRequisitions}
            icon={Send}
            tone="cyan"
            onClick={() => navigate(ROUTES.INVENTORY_PART_REQUISITIONS)}
          />
          <StatCard
            label="Pending Procurement Requests"
            value={stats.pendingProcurementRequests}
            icon={ClipboardList}
            tone="amber"
            onClick={() => navigate(ROUTES.INVENTORY_PROCUREMENT_REQUESTS)}
          />
          <StatCard
            label="Open Purchase Orders"
            value={stats.openPurchaseOrders}
            icon={FileText}
            tone="blue"
            onClick={() => navigate(ROUTES.INVENTORY_PURCHASE_ORDERS)}
          />
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <Boxes className="h-4 w-4 shrink-0 text-slate-400" />
          Every spare-parts operation - from procurement through receipt (via Inventory Upload),
          issue, and returns - lives under Inventory. Job Cards show a read-only view of what
          happened on that repair; this is where it actually happens.
        </div>
      </Card>
    </div>
  );
}
