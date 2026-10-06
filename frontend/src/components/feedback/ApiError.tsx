import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/utils';

interface ApiErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiError({ message, onRetry, className }: ApiErrorProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">
            API Request Failed
          </h4>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p>
          {onRetry && (
            <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
