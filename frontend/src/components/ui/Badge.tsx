import type React from 'react';
import { cn } from '@/utils';
import type { BadgeVariant } from '@/types';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// Pill status badges - light tint background, solid status-token text. Status values/meanings are
// unchanged; only the colours are now drawn from the shared design tokens.
const variantStyles: Record<BadgeVariant, string> = {
  default:
    'border border-border bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  neutral:
    'border border-border bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  success:
    'border border-green-200 bg-green-50 text-success dark:border-green-900/60 dark:bg-green-900/30 dark:text-green-400',
  warning:
    'border border-amber-200 bg-amber-50 text-warning dark:border-amber-900/60 dark:bg-amber-500/15 dark:text-amber-300',
  danger:
    'border border-red-200 bg-red-50 text-danger dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-400',
  info: 'border border-sky-200 bg-sky-50 text-info dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-400',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-[18px]',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
