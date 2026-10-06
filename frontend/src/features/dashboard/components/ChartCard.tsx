import type React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartCard({ title, subtitle, children, action }: ChartCardProps) {
  return (
    <Card className="rounded-xl border-gray-200/80 shadow-sm dark:border-gray-800/80" padding="md">
      <CardHeader className="mb-3 items-start">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <div className="h-72">{children}</div>
    </Card>
  );
}
