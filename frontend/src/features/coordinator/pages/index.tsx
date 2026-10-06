import { BarChart3, Bell } from 'lucide-react';
import { CoordinatorPlaceholderPage } from './CoordinatorPlaceholderPage';
export { CoordinatorExcelImportPage } from './CoordinatorExcelImportPage';
export { CoordinatorImportHistoryPage } from './CoordinatorImportHistoryPage';
export { CoordinatorTicketWorkbenchPage } from './CoordinatorTicketWorkbenchPage';
export { CoordinatorDashboardPage } from './CoordinatorDashboardPage';

export const CoordinatorReportsPage = () => (
  <CoordinatorPlaceholderPage title="Coordinator Reports" icon={BarChart3} />
);
export const CoordinatorNotificationsPage = () => (
  <CoordinatorPlaceholderPage title="Coordinator Notifications" icon={Bell} />
);
