import { Button, Card, Input } from '@/components/ui';
import type { AdminSetting } from '@/services/adminService';

interface SystemSettingsPanelProps {
  settings: AdminSetting[];
  canEdit: boolean;
  onValueChange: (settingKey: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function SystemSettingsPanel({
  settings,
  canEdit,
  onValueChange,
  onSave,
  saving,
}: SystemSettingsPanelProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="space-y-3">
        {settings.map((setting) => (
          <Input
            key={setting.settingKey}
            label={`${setting.category} • ${setting.settingKey}`}
            value={String(setting.value)}
            onChange={(event) => onValueChange(setting.settingKey, event.target.value)}
            disabled={!canEdit || !setting.editableByAdmin}
            hint={`Last updated: ${setting.updatedAt}`}
          />
        ))}
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={onSave} loading={saving}>
              Save Settings
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
