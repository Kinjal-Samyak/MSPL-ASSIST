import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type { CustomerFiltersState } from '../types/customer.types';

interface CustomerFiltersProps {
  filters: CustomerFiltersState;
  onChange: (updates: Partial<CustomerFiltersState>) => void;
}

export function CustomerFilters({ filters, onChange }: CustomerFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          placeholder="Search by rider name, rider ID, or phone number"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          leftElement={<Search className="h-4 w-4" />}
        />
        <Select
          value={filters.status}
          onChange={(event) =>
            onChange({ status: event.target.value as CustomerFiltersState['status'] })
          }
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'INACTIVE', label: 'Closed' },
          ]}
          placeholder="Status"
        />
      </div>
    </Card>
  );
}
