import { Button, Input } from '@/components/ui';
import type { ReportsFilterState } from '../types/report.types';

interface ReportFiltersProps {
  filters: ReportsFilterState;
  onChange: (next: Partial<ReportsFilterState>) => void;
  onReset: () => void;
}

export function ReportFilters({ filters, onChange, onReset }: ReportFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-3 xl:grid-cols-6">
      <Input
        value={filters.search}
        placeholder="Search"
        onChange={(event) => onChange({ search: event.target.value })}
      />
      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(event) => onChange({ dateFrom: event.target.value })}
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(event) => onChange({ dateTo: event.target.value })}
      />
      <Input
        value={filters.hubId}
        placeholder="Hub"
        onChange={(event) => onChange({ hubId: event.target.value })}
      />
      <Input
        value={filters.vehicleModelId}
        placeholder="Vehicle Model"
        onChange={(event) => onChange({ vehicleModelId: event.target.value })}
      />
      <Input
        value={filters.vehicle}
        placeholder="Vehicle"
        onChange={(event) => onChange({ vehicle: event.target.value })}
      />
      <Input
        value={filters.customerId}
        placeholder="Rider"
        onChange={(event) => onChange({ customerId: event.target.value })}
      />
      <Input
        value={filters.rider}
        placeholder="Rider"
        onChange={(event) => onChange({ rider: event.target.value })}
      />
      <Input
        value={filters.technicianId}
        placeholder="Technician"
        onChange={(event) => onChange({ technicianId: event.target.value })}
      />
      <Input
        value={filters.status}
        placeholder="Status"
        onChange={(event) => onChange({ status: event.target.value })}
      />
      <Input
        value={filters.category}
        placeholder="Category"
        onChange={(event) => onChange({ category: event.target.value })}
      />
      <div className="flex items-center">
        <Button variant="outline" className="w-full" onClick={onReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
