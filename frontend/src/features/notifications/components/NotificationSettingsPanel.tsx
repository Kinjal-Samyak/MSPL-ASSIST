import { Card, Button, Input } from '@/components/ui';
import type { NotificationChannelSetting } from '@/services/notificationService';

interface NotificationSettingsPanelProps {
  settings: NotificationChannelSetting[];
  onChange: (
    channel: NotificationChannelSetting['channel'],
    updates: { enabled?: boolean; maxRetries?: number }
  ) => void;
  onSave: () => void;
  saving: boolean;
}

export function NotificationSettingsPanel({
  settings,
  onChange,
  onSave,
  saving,
}: NotificationSettingsPanelProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="space-y-3">
        {settings.map((setting) => (
          <div
            key={setting.settingId}
            className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 p-3 dark:border-gray-800 md:grid-cols-4"
          >
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {setting.channel}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={setting.enabled}
                onChange={(event) => onChange(setting.channel, { enabled: event.target.checked })}
              />
              <span>Enabled</span>
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={String(setting.maxRetries)}
              onChange={(event) =>
                onChange(setting.channel, { maxRetries: Number(event.target.value) || 1 })
              }
            />
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Updated: {setting.updatedAt}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} loading={saving}>
          Save Channel Settings
        </Button>
      </div>
    </Card>
  );
}
