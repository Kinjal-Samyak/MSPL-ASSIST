import {
  AlertTriangle,
  PackageCheck,
  PackageX,
  RefreshCw,
  ShieldCheck,
  Timer,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, StatCard, type StatCardTone } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  technicianConsoleService,
  type TechnicianDashboard,
} from '../services/technicianConsoleService';
import { useTechnicianJobCards } from '../hooks/useTechnicianJobCards';
import { JobCardListPanel } from '../components/JobCardListPanel';

const EMPTY_DASHBOARD: TechnicianDashboard = {
  assignedJobs: 0,
  jobsInProgress: 0,
  waitingForParts: 0,
  completedToday: 0,
  averageRepairTimeHours: 0,
  slaCompliancePercent: 0,
  overdueJobs: 0,
  jobCardStageCounts: { IN_PROGRESS: 0, WAITING_PARTS: 0, RFD: 0 },
};

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

export function TechnicianDashboardPage() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [dashboardError, setDashboardError] = useState('');
  const list = useTechnicianJobCards();

  useEffect(() => {
    let active = true;
    technicianConsoleService
      .dashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((error) => {
        if (active) setDashboardError(toApiErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = () => {
    void list.reload();
    technicianConsoleService
      .dashboard()
      .then(setDashboard)
      .catch(() => undefined);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Wrench className="h-6 w-6 text-primary" />
            Technician Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your job cards at a glance. Select one below to open its full workspace.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={refresh}
          loading={list.loading}
        >
          Refresh
        </Button>
      </header>
      {dashboardError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
        >
          {dashboardError}
        </div>
      )}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label="In Progress"
          value={dashboard.jobCardStageCounts.IN_PROGRESS}
          icon={Wrench}
          tone="amber"
        />
        <Metric
          label="Waiting for Parts"
          value={dashboard.jobCardStageCounts.WAITING_PARTS}
          icon={PackageX}
          tone="rose"
        />
        <Metric
          label="Ready for Deployment"
          value={dashboard.jobCardStageCounts.RFD}
          icon={PackageCheck}
          tone="emerald"
        />
        <Metric
          label="Average Repair Time"
          value={`${dashboard.averageRepairTimeHours}h`}
          icon={Timer}
          tone="blue"
        />
        <Metric
          label="SLA Compliance"
          value={`${dashboard.slaCompliancePercent}%`}
          icon={ShieldCheck}
          tone="cyan"
        />
        <Metric
          label="Overdue Jobs"
          value={dashboard.overdueJobs}
          icon={AlertTriangle}
          tone="violet"
        />
      </section>
      <JobCardListPanel
        title={list.isAdmin ? 'Job Cards' : 'My Job Cards'}
        jobCards={list.jobCards}
        visibleJobCards={list.visibleJobCards}
        loading={list.loading}
        error={list.error}
        isAdmin={list.isAdmin}
        search={list.search}
        onSearchChange={list.setSearch}
        technicianFilter={list.technicianFilter}
        onTechnicianFilterChange={list.setTechnicianFilter}
        availableTechnicians={list.availableTechnicians}
        technicianNameById={list.technicianNameById}
        selectedJobCard={list.selectedJobCard}
        onSelectJobCard={list.setSelectedJobCard}
        onWorkflowChange={refresh}
        emptyMessage={list.isAdmin ? 'No job cards found.' : 'No job cards assigned to you yet.'}
      />
    </div>
  );
}
