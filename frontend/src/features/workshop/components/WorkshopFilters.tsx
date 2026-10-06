import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type { WorkshopWorkbenchStatus } from '@/services/workshopWorkbenchService';

export interface WorkshopWorkbenchFiltersState {
  search: string;
  hub: string;
  technicianId: string;
  status: '' | WorkshopWorkbenchStatus;
  priority: '' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface WorkshopFiltersProps {
  filters: WorkshopWorkbenchFiltersState;
  onChange: (updates: Partial<WorkshopWorkbenchFiltersState>) => void;
  hubOptions: string[];
  technicianOptions: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS: Array<{ value: WorkshopWorkbenchStatus; label: string }> = [
  { value: 'ASSIGNED', label: 'Assigned to Technician' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RFD', label: 'Ready for Delivery (RFD)' },
];

const PRIORITY_OPTIONS: Array<{ value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function WorkshopFilters({
  filters,
  onChange,
  hubOptions,
  technicianOptions,
}: WorkshopFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input
          placeholder="Search"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          leftElement={<Search className="h-4 w-4" />}
        />
        <Select
          value={filters.hub}
          onChange={(event) => onChange({ hub: event.target.value })}
          options={hubOptions.map((hub) => ({ value: hub, label: hub }))}
          placeholder="Hub"
        />
        <Select
          value={filters.technicianId}
          onChange={(event) => onChange({ technicianId: event.target.value })}
          options={technicianOptions.map((technician) => ({
            value: technician.id,
            label: technician.name,
          }))}
          placeholder="Technician"
        />
        <Select
          value={filters.status}
          onChange={(event) =>
            onChange({ status: event.target.value as WorkshopWorkbenchFiltersState['status'] })
          }
          options={STATUS_OPTIONS}
          placeholder="Status"
        />
        <Select
          value={filters.priority}
          onChange={(event) =>
            onChange({ priority: event.target.value as WorkshopWorkbenchFiltersState['priority'] })
          }
          options={PRIORITY_OPTIONS}
          placeholder="Priority"
        />
      </div>
    </Card>
  );
}
