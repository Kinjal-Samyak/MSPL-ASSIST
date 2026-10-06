import {
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  RotateCcw,
  Ticket,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import type { WorkshopWorkbenchSummary } from '@/services/workshopWorkbenchService';

export function WorkshopDashboard({ summary }: { summary: WorkshopWorkbenchSummary }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
      <StatCard
        label="Total Open Job Cards"
        value={summary.openJobCards}
        icon={ClipboardList}
        tone="slate"
      />
      <StatCard label="Total Open Tickets" value={summary.openTickets} icon={Ticket} tone="blue" />
      <StatCard
        label="Assigned to Technician"
        value={summary.assignedToTechnician}
        icon={UserCheck}
        tone="violet"
      />
      <StatCard label="In Progress" value={summary.inProgress} icon={Wrench} tone="amber" />
      <StatCard label="Completed" value={summary.completed} icon={CheckCircle2} tone="emerald" />
      <StatCard
        label="Ready for Delivery (RFD)"
        value={summary.readyForDeployment}
        icon={PackageCheck}
        tone="cyan"
      />
      <StatCard
        label="Returned to Workshop"
        value={summary.returnedToWorkshop}
        icon={RotateCcw}
        tone="rose"
      />
    </section>
  );
}
