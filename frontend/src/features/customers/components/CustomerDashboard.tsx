import { Users, UserCheck, UserX } from 'lucide-react';
import { StatCard } from '@/components/ui';

interface CustomerDashboardProps {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
}

export function CustomerDashboard({
  totalCustomers,
  activeCustomers,
  inactiveCustomers,
}: CustomerDashboardProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatCard label="Total Riders Onboarded" value={totalCustomers} icon={Users} tone="blue" />
      <StatCard label="Unique Closed Accounts" value={inactiveCustomers} icon={UserX} tone="rose" />
      <StatCard label="Active Accounts" value={activeCustomers} icon={UserCheck} tone="emerald" />
    </section>
  );
}
