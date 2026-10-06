import { BarChart2 } from 'lucide-react';
import { EmptyState } from '@/components/feedback';
import { Card, CardHeader, CardTitle } from '@/components/ui';

export function AnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Insights and metrics</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<BarChart2 className="h-10 w-10" />}
          title="Analytics coming soon"
          description="Analytics module will be implemented in a future sprint."
        />
      </Card>
    </div>
  );
}
