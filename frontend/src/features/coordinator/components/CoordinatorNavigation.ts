import {
  BarChart3,
  Bell,
  ClipboardList,
  FileSpreadsheet,
  History,
  LayoutDashboard,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import type { CoordinatorNavigationItem } from '../types/coordinator.types';

export const COORDINATOR_SECTION_ITEMS: CoordinatorNavigationItem[] = [
  {
    id: 'coordinator-dashboard',
    label: 'Dashboard',
    href: ROUTES.COORDINATOR,
    icon: LayoutDashboard,
  },
  {
    id: 'coordinator-tickets',
    label: 'Ticket Workbench',
    href: ROUTES.COORDINATOR_TICKETS,
    icon: ClipboardList,
  },
  {
    id: 'coordinator-import',
    label: 'Excel Import',
    href: ROUTES.COORDINATOR_IMPORT,
    icon: FileSpreadsheet,
  },
  {
    id: 'coordinator-import-history',
    label: 'Import History',
    href: ROUTES.COORDINATOR_IMPORT_HISTORY,
    icon: History,
  },
  {
    id: 'coordinator-reports',
    label: 'Reports',
    href: ROUTES.COORDINATOR_REPORTS,
    icon: BarChart3,
  },
  {
    id: 'coordinator-notifications',
    label: 'Notifications',
    href: ROUTES.COORDINATOR_NOTIFICATIONS,
    icon: Bell,
  },
];
