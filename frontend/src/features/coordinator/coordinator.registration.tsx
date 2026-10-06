import { UserCog, type LucideIcon } from 'lucide-react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { CoordinatorLayout } from './components';
import {
  CoordinatorDashboardPage,
  CoordinatorExcelImportPage,
  CoordinatorImportHistoryPage,
  CoordinatorNotificationsPage,
  CoordinatorReportsPage,
  CoordinatorTicketWorkbenchPage,
} from './pages';

export const COORDINATOR_NAVIGATION_ITEMS: Array<{
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}> = [{ id: 'coordinator', label: 'Coordinator', href: ROUTES.COORDINATOR, icon: UserCog }];

export const coordinatorRoutes: RouteObject[] = [
  {
    path: ROUTES.COORDINATOR,
    element: <CoordinatorLayout />,
    children: [
      { index: true, element: <CoordinatorDashboardPage /> },
      { path: ROUTES.COORDINATOR_TICKETS, element: <CoordinatorTicketWorkbenchPage /> },
      { path: ROUTES.COORDINATOR_IMPORT, element: <CoordinatorExcelImportPage /> },
      { path: ROUTES.COORDINATOR_IMPORT_HISTORY, element: <CoordinatorImportHistoryPage /> },
      { path: ROUTES.COORDINATOR_REPORTS, element: <CoordinatorReportsPage /> },
      { path: ROUTES.COORDINATOR_NOTIFICATIONS, element: <CoordinatorNotificationsPage /> },
      { path: '*', element: <Navigate to={ROUTES.COORDINATOR} replace /> },
    ],
  },
];
