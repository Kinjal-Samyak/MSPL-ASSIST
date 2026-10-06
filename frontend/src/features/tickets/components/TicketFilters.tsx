import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type {
  TicketFilterOptions,
  TicketFiltersState,
} from '@/features/tickets/types/ticket.types';

interface TicketFiltersProps {
  filters: TicketFiltersState;
  options: TicketFilterOptions;
  onChange: (updates: Partial<TicketFiltersState>) => void;
}

function toSelectOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

export function TicketFilters({ filters, options, onChange }: TicketFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <div className="xl:col-span-2">
          <Input
            placeholder="Search ticket, rider, vehicle..."
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          value={filters.hub}
          onChange={(event) => onChange({ hub: event.target.value })}
          options={toSelectOptions(options.hubs)}
          placeholder="Hub"
        />
        <Select
          value={filters.priority}
          onChange={(event) => onChange({ priority: event.target.value })}
          options={toSelectOptions(options.priorities)}
          placeholder="Priority"
        />
        <Select
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
          options={toSelectOptions(options.statuses)}
          placeholder="Status"
        />
        <Select
          value={filters.category}
          onChange={(event) => onChange({ category: event.target.value })}
          options={toSelectOptions(options.categories)}
          placeholder="Category"
        />
        <Select
          value={filters.technician}
          onChange={(event) => onChange({ technician: event.target.value })}
          options={toSelectOptions(options.technicians)}
          placeholder="Technician"
        />
        <Select
          value={filters.vehicleModel}
          onChange={(event) => onChange({ vehicleModel: event.target.value })}
          options={toSelectOptions(options.vehicleModels)}
          placeholder="Vehicle Model"
        />
        <Input
          placeholder="Vehicle Type"
          value={filters.vehicleType}
          onChange={(event) => onChange({ vehicleType: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange({ startDate: event.target.value })}
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange({ endDate: event.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
