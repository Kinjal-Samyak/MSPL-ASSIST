import { Download, Plus, RefreshCw, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui';

interface TicketToolbarProps {
  count: number;
  onRefresh: () => void;
  onCreateTicket: () => void;
}

export function TicketToolbar({ count, onRefresh, onCreateTicket }: TicketToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-gray-900 dark:text-gray-100">Ticket Workspace</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {count} tickets in current result set
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onCreateTicket}
        >
          New Ticket
        </Button>
        <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
        <Button variant="outline" size="sm" leftIcon={<Rows3 className="h-4 w-4" />}>
          Bulk Actions
        </Button>
      </div>
    </div>
  );
}
