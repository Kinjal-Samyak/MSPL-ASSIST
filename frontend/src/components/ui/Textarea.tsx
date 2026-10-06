import React from 'react';
import { cn } from '@/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-[15px] leading-6 text-slate-900',
            'placeholder:text-[15px] placeholder:leading-6 placeholder:text-slate-400 transition-colors',
            'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:focus:border-blue-400 dark:focus:ring-blue-500/20',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500',
            error && 'border-danger focus:ring-danger/10',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs leading-[18px] text-red-600 dark:text-red-400">{error}</p>}
        {hint && !error && (
          <p className="text-xs leading-[18px] text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
