import type { LucideIcon } from 'lucide-react';

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  tone: KpiTone;
  icon: LucideIcon;
}

export interface FleetTrendPoint {
  period: string;
  activeFleet: number;
  tickets: number;
}

export interface TicketStatusDatum {
  name: string;
  value: number;
  color: string;
}

export interface IssueCategoryDatum {
  category: string;
  count: number;
}

export interface HubPerformanceDatum {
  hub: string;
  completionRate: number;
}

export type ActivityStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'SLA_BREACHED';

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: ActivityStatus;
}

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}
