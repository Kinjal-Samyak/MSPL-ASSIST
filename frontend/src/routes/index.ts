import { createElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ServerErrorPage } from '@/pages/ServerErrorPage';
import { appRoutes } from './app.routes';
import { authRoutes } from './auth.routes';

export const router = createBrowserRouter([
  ...authRoutes,
  ...appRoutes,
  { path: ROUTES.SERVER_ERROR, element: createElement(ServerErrorPage) },
  { path: '*', element: createElement(NotFoundPage) },
]);
