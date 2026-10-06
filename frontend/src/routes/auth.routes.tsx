import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/LoginPage';

export const authRoutes: RouteObject[] = [
  {
    path: ROUTES.LOGIN,
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
];
