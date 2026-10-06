import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ROUTES } from '@/constants';

export function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-danger" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          You do not have permission to access this area.
        </p>
        <Link className="mt-5 inline-block" to={ROUTES.DASHBOARD}>
          <Button>Return to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
