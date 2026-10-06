import { Badge, Button, Input, Select } from '@/components/ui';
import { Drawer } from '@/components/layout';
import { ErrorState, Loader } from '@/components/feedback';
import type { AdminHub, AdminUser } from '@/services/adminService';

interface AdminUserDetailsDrawerProps {
  isOpen: boolean;
  loading: boolean;
  error: string;
  user: AdminUser | null;
  hubs: AdminHub[];
  canEdit: boolean;
  form: {
    name: string;
    email: string;
    mobile: string;
    role: AdminUser['role'];
    hubIds: string[];
  };
  onFormChange: (updates: Partial<AdminUserDetailsDrawerProps['form']>) => void;
  onRetry: () => void;
  onClose: () => void;
  onSave: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  saving: boolean;
}

export function AdminUserDetailsDrawer({
  isOpen,
  loading,
  error,
  user,
  hubs,
  canEdit,
  form,
  onFormChange,
  onRetry,
  onClose,
  onSave,
  onActivate,
  onDeactivate,
  onDelete,
  saving,
}: AdminUserDetailsDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={user?.name ?? 'User Details'}
      width="w-[560px]"
    >
      {loading ? (
        <Loader label="Loading user details..." />
      ) : error !== '' ? (
        <ErrorState title="Failed to load user details" message={error} onRetry={onRetry} />
      ) : !user ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a user to view details.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.mobile}</p>
              </div>
              <Badge variant={user.active ? 'success' : 'danger'}>
                {user.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <Input
            label="Name"
            value={form.name}
            onChange={(event) => onFormChange({ name: event.target.value })}
            disabled={!canEdit}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(event) => onFormChange({ email: event.target.value })}
            disabled={!canEdit}
          />
          <Input
            label="Mobile"
            value={form.mobile}
            onChange={(event) => onFormChange({ mobile: event.target.value })}
            disabled={!canEdit}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(event) => onFormChange({ role: event.target.value as AdminUser['role'] })}
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SERVICE_MANAGER', label: 'Service Manager' },
              { value: 'COORDINATOR', label: 'Coordinator' },
              { value: 'SERVICE_TL', label: 'Service Engineer' },
              { value: 'TECHNICIAN', label: 'Technician' },
            ]}
            disabled={!canEdit}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hub Access</p>
            <div className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              {hubs.map((hub) => (
                <label
                  key={hub.hubId}
                  className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={form.hubIds.includes(hub.hubId)}
                    disabled={!canEdit}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onFormChange({ hubIds: [...form.hubIds, hub.hubId] });
                        return;
                      }
                      onFormChange({ hubIds: form.hubIds.filter((hubId) => hubId !== hub.hubId) });
                    }}
                  />
                  <span>{hub.name}</span>
                </label>
              ))}
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onSave} loading={saving}>
                Save
              </Button>
              {user.active ? (
                <Button variant="danger" onClick={onDeactivate} loading={saving}>
                  Deactivate
                </Button>
              ) : (
                <Button variant="primary" onClick={onActivate} loading={saving}>
                  Activate
                </Button>
              )}
              <Button
                className="bg-danger text-white hover:bg-red-700"
                onClick={onDelete}
                loading={saving}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
