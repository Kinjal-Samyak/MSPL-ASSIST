import {
  Bell,
  Bike,
  CircleGauge,
  ClipboardList,
  FileText,
  Landmark,
  MapPin,
  Receipt,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, StatCard, type StatCardTone } from '@/components/ui';
import type { ExecutiveDashboardResponse, ReportDashboardResponse } from '@/services/reportService';
import { formatDateTime } from '@/utils';

interface ReportDashboardProps {
  dashboard: ReportDashboardResponse | null;
  executive: ExecutiveDashboardResponse | null;
}

const REPORT_CARD_META: Record<string, { icon: LucideIcon; tone: StatCardTone }> = {
  tickets: { icon: Ticket, tone: 'blue' },
  customers: { icon: Users, tone: 'emerald' },
  vehicles: { icon: Bike, tone: 'amber' },
  deployments: { icon: MapPin, tone: 'violet' },
  workshop: { icon: ClipboardList, tone: 'rose' },
  notifications: { icon: Bell, tone: 'cyan' },
  admin: { icon: ShieldCheck, tone: 'indigo' },
};
const DEFAULT_REPORT_CARD_META = { icon: FileText, tone: 'slate' as StatCardTone };

const KPI_META = [
  {
    key: 'fleetUtilization',
    label: 'Fleet Utilization %',
    icon: CircleGauge,
    tone: 'blue' as StatCardTone,
  },
  { key: 'revenue', label: 'Revenue', icon: TrendingUp, tone: 'emerald' as StatCardTone },
  { key: 'processingFees', label: 'Processing Fees', icon: Receipt, tone: 'amber' as StatCardTone },
  {
    key: 'securityDeposits',
    label: 'Security Deposits',
    icon: Landmark,
    tone: 'violet' as StatCardTone,
  },
  { key: 'openTickets', label: 'Open Tickets', icon: Ticket, tone: 'rose' as StatCardTone },
  {
    key: 'workshopJobs',
    label: 'Workshop Jobs',
    icon: ClipboardList,
    tone: 'cyan' as StatCardTone,
  },
  { key: 'deployments', label: 'Deployments', icon: MapPin, tone: 'indigo' as StatCardTone },
  { key: 'customerCount', label: 'Riders', icon: Users, tone: 'slate' as StatCardTone },
  {
    key: 'notificationFailures',
    label: 'Notification Failures',
    icon: XCircle,
    tone: 'rose' as StatCardTone,
  },
] as const;

export function ReportDashboard({ dashboard, executive }: ReportDashboardProps) {
  return (
    <div className="space-y-4">
      <Card padding="md">
        <CardHeader>
          <CardTitle>Report Dashboard</CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generated: {dashboard ? formatDateTime(dashboard.generatedAt) : '-'}
          </p>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          {(dashboard?.reports ?? []).map((item) => {
            const meta = REPORT_CARD_META[item.reportKey] ?? DEFAULT_REPORT_CARD_META;
            return (
              <StatCard
                key={item.reportKey}
                label={item.title}
                value={item.totalRecords}
                icon={meta.icon}
                tone={meta.tone}
              />
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPI_META.map(({ key, label, icon, tone }) => (
          <StatCard
            key={key}
            label={label}
            value={executive ? executive.kpi[key] : '-'}
            icon={icon}
            tone={tone}
          />
        ))}
      </div>
    </div>
  );
}
