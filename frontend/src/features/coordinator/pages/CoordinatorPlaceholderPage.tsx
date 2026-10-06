import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/feedback';
import { Card } from '@/components/ui';
import { coordinatorPlaceholderDescription } from '../utils/coordinator.utils';

export function CoordinatorPlaceholderPage({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning dark:text-yellow-400">
          Coordinator module
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          {title}
        </h1>
      </header>
      <Card>
        <EmptyState
          icon={<Icon className="h-10 w-10" />}
          title={`${title} coming soon`}
          description={coordinatorPlaceholderDescription(title)}
        />
      </Card>
    </div>
  );
}
