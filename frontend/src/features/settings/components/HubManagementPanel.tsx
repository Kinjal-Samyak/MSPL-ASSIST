import { Button, Card, Input } from '@/components/ui';
import type { AdminHub } from '@/services/adminService';

interface HubManagementPanelProps {
  hubs: AdminHub[];
  canEdit: boolean;
  form: {
    name: string;
    city: string;
    state: string;
  };
  editingHubId: string;
  onFormChange: (updates: Partial<HubManagementPanelProps['form']>) => void;
  onSelectHub: (hubId: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function HubManagementPanel({
  hubs,
  canEdit,
  form,
  editingHubId,
  onFormChange,
  onSelectHub,
  onSave,
  saving,
}: HubManagementPanelProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-2 py-2">Hub</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {hubs.map((hub) => (
                <tr
                  key={hub.hubId}
                  className={`cursor-pointer border-t border-gray-100 dark:border-gray-800 ${
                    editingHubId === hub.hubId ? 'bg-primary/10 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => onSelectHub(hub.hubId)}
                >
                  <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {hub.name}
                  </td>
                  <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                    {hub.city}, {hub.state}
                  </td>
                  <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                    {hub.active ? 'Active' : 'Inactive'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <Input
            label="Hub Name"
            value={form.name}
            onChange={(event) => onFormChange({ name: event.target.value })}
            disabled={!canEdit}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(event) => onFormChange({ city: event.target.value })}
            disabled={!canEdit}
          />
          <Input
            label="State"
            value={form.state}
            onChange={(event) => onFormChange({ state: event.target.value })}
            disabled={!canEdit}
          />
          {canEdit && (
            <Button onClick={onSave} loading={saving}>
              {editingHubId ? 'Update Hub' : 'Create Hub'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
