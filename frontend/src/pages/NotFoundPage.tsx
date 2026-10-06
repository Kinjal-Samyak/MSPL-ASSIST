import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center dark:bg-gray-950">
      <p className="mb-4 text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
      <p className="mt-2 max-w-sm text-gray-500 dark:text-gray-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to={ROUTES.DASHBOARD} className="mt-6">
        <Button variant="primary">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
