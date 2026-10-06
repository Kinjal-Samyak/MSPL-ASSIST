import {
  Building2,
  ClipboardList,
  FileText,
  ShieldCheck,
  Ticket,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';
import type { ReportTabKey } from '@/services/reportService';

export interface ReportCatalogEntry {
  key: ReportTabKey;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

/** Extended by each Reports Module slice as its new report types land - this is Slice 0's
 * scope: the 7 pre-existing report types, unchanged in access (ADMIN+COORDINATOR), just
 * relocated here from the old hardcoded TAB_OPTIONS array for a single source of truth. */
export const REPORT_CATALOG: ReportCatalogEntry[] = [
  { key: 'tickets', label: 'Ticket Analytics', icon: Ticket, roles: ['ADMIN', 'COORDINATOR'] },
  { key: 'customers', label: 'Rider Analytics', icon: Users, roles: ['ADMIN', 'COORDINATOR'] },
  { key: 'vehicles', label: 'Vehicle Analytics', icon: Truck, roles: ['ADMIN', 'COORDINATOR'] },
  {
    key: 'deployments',
    label: 'Deployment Analytics',
    icon: Building2,
    roles: ['ADMIN', 'COORDINATOR'],
  },
  { key: 'workshop', label: 'Workshop Analytics', icon: Wrench, roles: ['ADMIN', 'COORDINATOR'] },
  {
    key: 'notifications',
    label: 'Notification Analytics',
    icon: FileText,
    roles: ['ADMIN', 'COORDINATOR'],
  },
  { key: 'admin', label: 'Admin Analytics', icon: ShieldCheck, roles: ['ADMIN', 'COORDINATOR'] },
];

export function getVisibleReports(role: UserRole | undefined): ReportCatalogEntry[] {
  if (!role) return [];
  return REPORT_CATALOG.filter((entry) => entry.roles.includes(role));
}

export const REPORT_ICON_FALLBACK: LucideIcon = ClipboardList;
