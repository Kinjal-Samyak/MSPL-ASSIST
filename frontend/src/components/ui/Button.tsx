import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import type { ButtonSize, ButtonVariant } from '@/types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Primary / neutral (secondary, outline, ghost) / danger - the three colours the enterprise
// theme allows on a button. "outline" is the spec's literal "Secondary" button (white, blue
// border, blue text); "secondary" (muted fill) and "ghost" (text-only) stay as lighter-weight
// neutral options rather than being removed, since call sites across the app rely on them.
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary disabled:bg-primary/40',
  secondary:
    'bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-neutral dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  outline:
    'border border-primary bg-surface text-primary hover:bg-primary/5 focus-visible:ring-primary dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 focus-visible:ring-primary dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger disabled:bg-danger/40',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] font-medium leading-5 gap-1.5',
  md: 'h-9 px-4 text-sm font-medium leading-5 gap-2',
  lg: 'h-10 px-5 text-[15px] font-medium leading-6 gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled ?? loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-slate-950',
        'disabled:cursor-not-allowed disabled:opacity-50 select-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
);

Button.displayName = 'Button';
