import { Building2, Key, Lock, Settings, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { StatCard } from '@/components/ui';

interface AdminDashboardProps {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalHubs: number;
  totalSettings: number;
}

export function AdminDashboard(props: AdminDashboardProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
      <StatCard label="Total Users" value={props.totalUsers} icon={Users} tone="blue" />
      <StatCard label="Active Users" value={props.activeUsers} icon={UserCheck} tone="emerald" />
      <StatCard label="Inactive Users" value={props.inactiveUsers} icon={Lock} tone="rose" />
      <StatCard label="Roles" value={props.totalRoles} icon={ShieldCheck} tone="violet" />
      <StatCard label="Permissions" value={props.totalPermissions} icon={Key} tone="amber" />
      <StatCard label="Hubs" value={props.totalHubs} icon={Building2} tone="cyan" />
      <StatCard label="Settings" value={props.totalSettings} icon={Settings} tone="slate" />
    </section>
  );
}
