import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader } from '@/components/feedback';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store';
import type { UserRole } from '@mspl/shared-constants';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage label="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
