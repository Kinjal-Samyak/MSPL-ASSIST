import { Outlet } from 'react-router-dom';
import { CoordinatorSidebar } from './CoordinatorSidebar';

export function CoordinatorLayout() {
  return (
    <div className="flex flex-col gap-5 p-5 md:flex-row md:p-7">
      <CoordinatorSidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
