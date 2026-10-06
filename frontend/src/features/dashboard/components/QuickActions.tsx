import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import type { QuickActionItem } from '@/features/dashboard/types';
import { cn } from '@/utils';

interface QuickActionsProps {
  actions: QuickActionItem[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="rounded-xl border-gray-200/80 shadow-sm dark:border-gray-800/80" padding="md">
      <CardHeader className="mb-2">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="space-y-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className={cn(
                'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors',
                'hover:border-primary/30 hover:bg-primary/10 dark:border-gray-800 dark:bg-gray-900',
                'dark:hover:border-blue-800 dark:hover:bg-blue-900/20'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-gray-100 p-1.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
