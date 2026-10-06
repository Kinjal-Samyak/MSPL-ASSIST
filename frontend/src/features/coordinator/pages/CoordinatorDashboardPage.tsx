import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { coordinatorService } from '../services/coordinatorService';

export function CoordinatorDashboardPage() {
  const [summary, setSummary] = useState<any>({});
  const [actions, setActions] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    void Promise.all([
      coordinatorService.coordinatorDashboard(),
      coordinatorService.actionCenter(),
    ]).then(([dashboard, actionCenter]) => {
      setSummary(dashboard);
      setActions(actionCenter);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-warning">
          Coordinator module
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">Today’s Operations</h1>
        <p className="mt-2 text-sm text-slate-700">Start with the work that needs attention now.</p>
      </header>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Action Center</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => navigate(`${ROUTES.COORDINATOR_TICKETS}?quick=${action.quick}`)}
              className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-warning/60"
            >
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="mt-3 text-2xl font-semibold text-slate-50">{action.count}</p>
              <p className="text-sm text-slate-300">{action.label}</p>
              <span className="mt-3 inline-flex items-center text-xs text-warning">
                Open workbench <ArrowRight className="ml-1 h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ['New', summary.new],
          ['In Progress', summary.inProgress],
          ['Waiting for Parts', summary.waiting],
          ['High Priority', summary.highPriority],
          ['Closed Today', summary.closedToday],
        ].map(([label, value]) => (
          <Card key={String(label)} padding="sm">
            <p className="text-xs font-medium text-slate-700">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-black">{value ?? 0}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
