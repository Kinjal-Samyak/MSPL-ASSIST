import { LayoutDashboard, ListChecks, UserCheck, type LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { ServiceEngineerDashboardPage, ServiceTlWorkspacePage } from './pages';

export const SERVICE_TL_NAVIGATION_ITEMS: Array<{
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  children?: Array<{ id: string; label: string; href: string; icon: LucideIcon }>;
}> = [
  {
    id: 'service-tl',
    label: 'Service Engineer',
    href: ROUTES.SERVICE_TL_DASHBOARD,
    icon: UserCheck,
    children: [
      {
        id: 'service-tl-dashboard',
        label: 'Dashboard',
        href: ROUTES.SERVICE_TL_DASHBOARD,
        icon: LayoutDashboard,
      },
      { id: 'service-tl-tickets', label: 'My Tickets', href: ROUTES.SERVICE_TL, icon: ListChecks },
    ],
  },
];

export const serviceTlRoutes: RouteObject[] = [
  { path: ROUTES.SERVICE_TL_DASHBOARD, element: <ServiceEngineerDashboardPage /> },
  { path: ROUTES.SERVICE_TL, element: <ServiceTlWorkspacePage /> },
];
