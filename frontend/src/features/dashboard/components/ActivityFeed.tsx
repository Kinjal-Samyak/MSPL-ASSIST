import { CircleDot } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import type { ActivityItem } from '@/features/dashboard/types';

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="rounded-2xl border-slate-700" padding="md">
      <CardHeader className="mb-0">
        <CardTitle>Latest Activity</CardTitle>
      </CardHeader>
      <ul className="mt-3 space-y-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="relative flex gap-3 border-l border-slate-600 pb-5 pl-4 last:border-l-0 last:pb-0"
          >
            <div className="absolute -left-[7px] top-0.5 rounded-full bg-slate-800">
              <CircleDot className="h-4 w-4 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {item.timestamp}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
