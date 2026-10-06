import React from 'react';
import { cn } from '@/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mspl-surface rounded-xl border border-border text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:text-slate-100 dark:shadow-none',
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export const CardHeader = ({ className, children, ...props }: CardHeaderProps) => (
  <div className={cn('mb-4 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
export const CardTitle = ({ className, children, ...props }: CardTitleProps) => (
  <h3 className={cn('mspl-card-title text-gray-900 dark:text-gray-100', className)} {...props}>
    {children}
  </h3>
);
