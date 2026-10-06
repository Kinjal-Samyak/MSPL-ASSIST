import {
  ClipboardList,
  History,
  LayoutDashboard,
  PackageCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import {
  ActiveJobsPage,
  CompletedJobsPage,
  JobHistoryPage,
  TechnicianDashboardPage,
} from './pages';

export const TECHNICIAN_NAVIGATION_ITEMS: Array<{
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  children?: Array<{ id: string; label: string; href: string; icon: LucideIcon }>;
}> = [
  {
    id: 'technician',
    label: 'Technician',
    href: ROUTES.TECHNICIAN_DASHBOARD,
    icon: Wrench,
    children: [
      {
        id: 'technician-dashboard',
        label: 'Dashboard',
        href: ROUTES.TECHNICIAN_DASHBOARD,
        icon: LayoutDashboard,
      },
      {
        id: 'technician-active',
        label: 'Active Job Cards',
        href: ROUTES.TECHNICIAN_ACTIVE,
        icon: ClipboardList,
      },
      {
        id: 'technician-completed',
        label: 'Completed Job Cards',
        href: ROUTES.TECHNICIAN_COMPLETED,
        icon: PackageCheck,
      },
      {
        id: 'technician-history',
        label: 'Job History',
        href: ROUTES.TECHNICIAN_HISTORY,
        icon: History,
      },
    ],
  },
];

export const technicianRoutes: RouteObject[] = [
  { path: ROUTES.TECHNICIAN_DASHBOARD, element: <TechnicianDashboardPage /> },
  { path: ROUTES.TECHNICIAN_ACTIVE, element: <ActiveJobsPage /> },
  { path: ROUTES.TECHNICIAN_COMPLETED, element: <CompletedJobsPage /> },
  { path: ROUTES.TECHNICIAN_HISTORY, element: <JobHistoryPage /> },
];
