import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2.5 pr-8 text-[15px] leading-6 text-slate-900',
              'cursor-pointer transition-colors',
              'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:focus:border-blue-400 dark:focus:ring-blue-500/20',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
              error && 'border-danger focus:ring-danger/10',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        {error && <p className="text-xs leading-[18px] text-red-600 dark:text-red-400">{error}</p>}
        {hint && !error && (
          <p className="text-xs leading-[18px] text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
