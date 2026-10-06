import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type { VehicleFiltersState } from '../types/vehicle.types';

interface VehicleFiltersProps {
  filters: VehicleFiltersState;
  onChange: (updates: Partial<VehicleFiltersState>) => void;
}

export function VehicleFilters({ filters, onChange }: VehicleFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input
          placeholder="Search fleet by MV Track, vehicle no, VIN, rider"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          leftElement={<Search className="h-4 w-4" />}
        />
        <Input
          placeholder="Hub"
          value={filters.hubName}
          onChange={(event) => onChange({ hubName: event.target.value })}
        />
        <Input
          placeholder="Model Code"
          value={filters.modelCode}
          onChange={(event) => onChange({ modelCode: event.target.value })}
        />
        <Select
          value={filters.status}
          onChange={(event) =>
            onChange({ status: event.target.value as VehicleFiltersState['status'] })
          }
          options={[
            { value: '', label: 'All Fleet States' },
            { value: 'INACTIVE', label: 'Inventory Hold' },
            { value: 'AVAILABLE', label: 'Ready for Deployment' },
            { value: 'DEPLOYED', label: 'Revenue Fleet' },
            { value: 'WORKSHOP', label: 'Down' },
          ]}
        />
      </div>
    </Card>
  );
}
