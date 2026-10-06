import { Navigate, type RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { AppLayout } from '@/layouts/AppLayout';
import { AnalyticsPage } from '@/features/analytics/pages';
import { CustomersPage } from '@/features/customers/pages';
import { DashboardPage } from '@/features/dashboard/pages';
import { DeploymentsPage } from '@/features/deployments/pages';
import { NotificationsPage } from '@/features/notifications/pages';
import { WorkshopPage } from '@/features/workshop/pages';
import {
  InventoryLedgerPage,
  PartsInventoryImportPage,
  PartsMasterImportPage,
  PartsPage,
  UploadHistoryPage,
} from '@/features/parts/pages';
import {
  CentralInventoryPage,
  InventoryDashboardPage,
  PartRequisitionsPage,
  ProcurementRequestsPage,
  PurchaseOrdersPage,
  SuppliersPage,
} from '@/features/inventory/pages';
import { ReportsPage } from '@/features/reports/pages';
import { SettingsPage } from '@/features/settings/pages';
import { TicketsPage } from '@/features/tickets/pages';
import { VehiclesPage } from '@/features/vehicles/pages';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { ROUTE_ACCESS } from '@/constants/navigation';
import { coordinatorRoutes } from '@/features/coordinator/coordinator.registration';
import { technicianRoutes } from '@/features/technician/technician.registration';
import { serviceTlRoutes } from '@/features/service-tl/service-tl.registration';

export const appRoutes: RouteObject[] = [
  {
    path: ROUTES.HOME,
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
          { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.tickets} />,
            children: [{ path: ROUTES.TICKETS, element: <TicketsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.customers} />,
            children: [{ path: ROUTES.CUSTOMERS, element: <CustomersPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.vehicles} />,
            children: [{ path: ROUTES.VEHICLES, element: <VehiclesPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.deployments} />,
            children: [{ path: ROUTES.DEPLOYMENTS, element: <DeploymentsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.workshop} />,
            children: [{ path: ROUTES.WORKSHOP, element: <WorkshopPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.inventory} />,
            children: [
              { path: ROUTES.INVENTORY_DASHBOARD, element: <InventoryDashboardPage /> },
              { path: ROUTES.PARTS, element: <PartsPage /> },
              { path: ROUTES.PARTS_IMPORT, element: <PartsMasterImportPage /> },
              { path: ROUTES.PARTS_INVENTORY_IMPORT, element: <PartsInventoryImportPage /> },
              { path: ROUTES.PARTS_INVENTORY_LEDGER, element: <InventoryLedgerPage /> },
              { path: ROUTES.PARTS_UPLOAD_HISTORY, element: <UploadHistoryPage /> },
              { path: ROUTES.INVENTORY_CENTRAL, element: <CentralInventoryPage /> },
              { path: ROUTES.INVENTORY_PART_REQUISITIONS, element: <PartRequisitionsPage /> },
              {
                path: ROUTES.INVENTORY_GOODS_ISSUE,
                element: <InventoryLedgerPage presetTransactionType="ISSUE" />,
              },
              {
                path: ROUTES.INVENTORY_RETURNS,
                element: <InventoryLedgerPage presetTransactionType="RETURN" />,
              },
              { path: ROUTES.INVENTORY_PROCUREMENT_REQUESTS, element: <ProcurementRequestsPage /> },
              { path: ROUTES.INVENTORY_PURCHASE_ORDERS, element: <PurchaseOrdersPage /> },
              { path: ROUTES.INVENTORY_SUPPLIERS, element: <SuppliersPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.notifications} />,
            children: [{ path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.reports} />,
            children: [{ path: ROUTES.REPORTS, element: <ReportsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.analytics} />,
            children: [{ path: ROUTES.ANALYTICS, element: <AnalyticsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.settings} />,
            children: [{ path: ROUTES.SETTINGS, element: <SettingsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.coordinator} />,
            children: coordinatorRoutes,
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.technician} />,
            children: technicianRoutes,
          },
          {
            element: <ProtectedRoute allowedRoles={ROUTE_ACCESS.serviceTl} />,
            children: serviceTlRoutes,
          },
        ],
      },
    ],
  },
];
