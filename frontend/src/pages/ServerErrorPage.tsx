import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui';

export function ServerErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center dark:bg-gray-950">
      <p className="mb-4 text-7xl font-bold text-danger">500</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Server error</h1>
      <p className="mt-2 max-w-sm text-gray-500 dark:text-gray-400">
        An unexpected server error occurred. Our team has been notified.
      </p>
      <Link to={ROUTES.DASHBOARD} className="mt-6">
        <Button variant="primary">Return to Dashboard</Button>
      </Link>
    </div>
  );
}
