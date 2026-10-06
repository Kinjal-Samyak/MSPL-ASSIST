import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-warning dark:text-yellow-400">
          Home / Dashboard
        </p>
        <h1 className="text-slate-950 dark:text-slate-50">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm">
          <CalendarDays className="h-3.5 w-3.5" />
          {today}
        </div>
        <Button variant="outline" size="sm">
          Export Snapshot
        </Button>
      </div>
    </header>
  );
}
