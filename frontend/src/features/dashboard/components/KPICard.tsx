import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  tone?: Tone;
  icon: LucideIcon;
}

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-success/10 text-success dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-warning/10 text-warning dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-danger/10 text-danger dark:bg-rose-900/30 dark:text-rose-300',
  info: 'bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-300',
};

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  tone = 'neutral',
  icon: Icon,
}: KPICardProps) {
  const isPositive = change.startsWith('+');

  return (
    <Card
      className={cn(
        'border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none'
      )}
      padding="md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-base font-semibold leading-6 text-gray-700 dark:text-gray-200">
            {title}
          </p>
          <p className="mspl-metric text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', TONE_STYLES[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-sm font-medium leading-5">
        {isPositive ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-success" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
        )}
        <span className={cn('font-semibold', isPositive ? 'text-success' : 'text-danger')}>
          {change}
        </span>
        <span className="text-gray-500 dark:text-gray-400">{changeLabel}</span>
      </div>
    </Card>
  );
}
