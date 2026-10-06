import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type { DeploymentFiltersState } from '../types/deployment.types';

interface DeploymentFiltersProps {
  filters: DeploymentFiltersState;
  onChange: (updates: Partial<DeploymentFiltersState>) => void;
}

export function DeploymentFilters({ filters, onChange }: DeploymentFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input
          placeholder="Search by deployment, rider, vehicle, MV Track"
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
          value={filters.rentalStatus}
          onChange={(event) =>
            onChange({ rentalStatus: event.target.value as DeploymentFiltersState['rentalStatus'] })
          }
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'MAINTENANCE', label: 'Maintenance' },
          ]}
          placeholder="Rental Status"
        />
      </div>
    </Card>
  );
}
