import { CheckCircle2, Clock, LayoutGrid, PlayCircle, Ticket, Wrench } from 'lucide-react';
import { StatCard } from '@/components/ui';

interface DeploymentDashboardProps {
  totalDeployments: number;
  activeDeployments: number;
  pendingDeployments: number;
  completedDeployments: number;
  maintenanceDeployments: number;
  deploymentsWithOpenTickets: number;
}

export function DeploymentDashboard({
  totalDeployments,
  activeDeployments,
  pendingDeployments,
  completedDeployments,
  maintenanceDeployments,
  deploymentsWithOpenTickets,
}: DeploymentDashboardProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      <StatCard label="Total" value={totalDeployments} icon={LayoutGrid} tone="slate" />
      <StatCard label="Active" value={activeDeployments} icon={PlayCircle} tone="blue" />
      <StatCard label="Pending" value={pendingDeployments} icon={Clock} tone="amber" />
      <StatCard label="Completed" value={completedDeployments} icon={CheckCircle2} tone="emerald" />
      <StatCard label="Maintenance" value={maintenanceDeployments} icon={Wrench} tone="rose" />
      <StatCard
        label="Open Tickets"
        value={deploymentsWithOpenTickets}
        icon={Ticket}
        tone="violet"
      />
    </section>
  );
}
