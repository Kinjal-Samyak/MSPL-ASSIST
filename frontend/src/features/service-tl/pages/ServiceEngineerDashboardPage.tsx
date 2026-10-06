import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Eye,
  Gauge,
  PackageCheck,
  RefreshCw,
  Send,
  Truck,
  Undo2,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Button,
  Card,
  StatCard,
  Timeline,
  type StatCardTone,
  type TimelineEntry,
} from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { titleCaseFromCode } from '@/utils';
import { ticketService, type ServiceEngineerDashboard } from '@/services/ticketService';

const EMPTY_DASHBOARD: ServiceEngineerDashboard = {
  jobsByStatus: { created: 0, review: 0, workshopRequired: 0, rfd: 0 },
  jobsAwaitingAssignment: 0,
  jobsAwaitingPartsApproval: 0,
  jobsAwaitingGoodsIssue: 0,
  jobsAwaitingReturnsVerification: 0,
  jobsReadyForReview: 0,
  jobsReadyForDelivery: 0,
  overdueJobs: 0,
  technicianAvailability: { available: 0, busy: 0, total: 0 },
  workshopUtilizationPercent: 0,
  inventoryAlerts: 0,
  recentActivity: [],
};

function Metric({
  label,
  value,
  icon,
  tone,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatCardTone;
  sublabel?: string;
}) {
  return <StatCard label={label} value={value} icon={icon} tone={tone} sublabel={sublabel} />;
}

/** Document 9, Phase 9.1 - Service Engineer Dashboard. Every figure comes from the existing
 * workshop/inventory data (spare part requests, return requests, job cards, tickets, parts,
 * technicians) via GET /service-tl-workspace/dashboard - nothing is computed client-side. */
export function ServiceEngineerDashboardPage() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await ticketService.getServiceEngineerDashboard());
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activityItems: TimelineEntry[] = dashboard.recentActivity.map((activity) => ({
    id: activity.id,
    title: `${titleCaseFromCode(activity.activityType)} — ${activity.ticketNumber}`,
    description: activity.description,
    timestamp: activity.performedAt,
    actor: activity.performedByName ?? undefined,
  }));

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <UserCheck className="h-6 w-6 text-primary" />
            Service Engineer Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Operational overview of the workshop you own.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void load()}
          loading={loading}
        >
          Refresh
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Action Queues
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric
            label="Awaiting Assignment"
            value={dashboard.jobsAwaitingAssignment}
            icon={ClipboardList}
            tone="blue"
          />
          <Metric
            label="Awaiting Parts Approval"
            value={dashboard.jobsAwaitingPartsApproval}
            icon={PackageCheck}
            tone="amber"
          />
          <Metric
            label="Awaiting Goods Issue"
            value={dashboard.jobsAwaitingGoodsIssue}
            icon={Send}
            tone="amber"
          />
          <Metric
            label="Awaiting Returns Verification"
            value={dashboard.jobsAwaitingReturnsVerification}
            icon={Undo2}
            tone="violet"
          />
          <Metric
            label="Ready for Review"
            value={dashboard.jobsReadyForReview}
            icon={Eye}
            tone="cyan"
          />
          <Metric
            label="Ready for Delivery"
            value={dashboard.jobsReadyForDelivery}
            icon={Truck}
            tone="emerald"
          />
          <Metric
            label="Overdue Jobs"
            value={dashboard.overdueJobs}
            icon={AlertTriangle}
            tone="rose"
          />
          <Metric
            label="Inventory Alerts"
            value={dashboard.inventoryAlerts}
            icon={Boxes}
            tone="rose"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Workshop
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric
            label="Technician Availability"
            value={`${dashboard.technicianAvailability.available} / ${dashboard.technicianAvailability.total}`}
            sublabel="available now"
            icon={Users}
            tone="blue"
          />
          <Metric
            label="Workshop Utilisation"
            value={`${dashboard.workshopUtilizationPercent}%`}
            icon={Gauge}
            tone="indigo"
          />
          <Metric
            label="Jobs In Progress"
            value={dashboard.jobsByStatus.workshopRequired}
            sublabel={`${dashboard.jobsByStatus.created} created · ${dashboard.jobsByStatus.review} in review · ${dashboard.jobsByStatus.rfd} at RFD`}
            icon={ClipboardList}
            tone="slate"
          />
        </div>
      </section>

      <Card className="border-slate-200 bg-white" padding="md">
        <h3 className="mb-3 text-sm font-medium text-slate-700">Recent Activity</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <Timeline items={activityItems} emptyMessage="No recent activity on your tickets yet." />
        )}
      </Card>
    </div>
  );
}
