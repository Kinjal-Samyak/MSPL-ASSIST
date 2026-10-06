import { Search } from 'lucide-react';
import { Card, Input, Select } from '@/components/ui';
import type { AdminHub } from '@/services/adminService';
import type { AdminUserFiltersState } from '../types/admin.types';

interface AdminUserFiltersProps {
  filters: AdminUserFiltersState;
  hubs: AdminHub[];
  onChange: (updates: Partial<AdminUserFiltersState>) => void;
}

export function AdminUserFilters({ filters, hubs, onChange }: AdminUserFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input
          placeholder="Search user by name, email or mobile"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          leftElement={<Search className="h-4 w-4" />}
        />
        <Select
          value={filters.role}
          onChange={(event) =>
            onChange({ role: event.target.value as AdminUserFiltersState['role'] })
          }
          options={[
            { value: 'ADMIN', label: 'Admin' },
            { value: 'COORDINATOR', label: 'Coordinator' },
            { value: 'TECHNICIAN', label: 'Technician' },
          ]}
          placeholder="Role"
        />
        <Select
          value={filters.active}
          onChange={(event) =>
            onChange({
              active: event.target.value as AdminUserFiltersState['active'],
            })
          }
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
          placeholder="Status"
        />
        <Select
          value={filters.hubId}
          onChange={(event) => onChange({ hubId: event.target.value })}
          options={hubs.map((hub) => ({
            value: hub.hubId,
            label: hub.name,
          }))}
          placeholder="Hub"
        />
      </div>
    </Card>
  );
}
