import { Card, Input, Select, Textarea, Button } from '@/components/ui';
import type { NotificationTemplate } from '@/services/notificationService';
import type { TemplateFormState } from '../types/notification.types';

interface NotificationTemplatesPanelProps {
  templates: NotificationTemplate[];
  form: TemplateFormState;
  selectedTemplateId: string;
  onFormChange: (updates: Partial<TemplateFormState>) => void;
  onSelectedTemplateChange: (templateId: string) => void;
  onSave: () => void;
  saving: boolean;
}

const EVENT_OPTIONS: TemplateFormState['eventType'][] = [
  'TICKET_CREATED',
  'TICKET_ASSIGNED',
  'TICKET_CLOSED',
  'WORKSHOP_ASSIGNED',
  'WORKSHOP_COMPLETED',
  'DEPLOYMENT_STARTED',
  'DEPLOYMENT_CLOSED',
  'CUSTOMER_CREATED',
  'VEHICLE_ACTIVATED',
  'VEHICLE_DEACTIVATED',
  'USER_CREATED',
  'USER_UPDATED',
];

const CHANNEL_OPTIONS: TemplateFormState['channel'][] = ['WHATSAPP', 'SMS', 'EMAIL', 'IN_APP'];

export function NotificationTemplatesPanel({
  templates,
  form,
  selectedTemplateId,
  onFormChange,
  onSelectedTemplateChange,
  onSave,
  saving,
}: NotificationTemplatesPanelProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Select
          value={selectedTemplateId}
          onChange={(event) => onSelectedTemplateChange(event.target.value)}
          options={[
            { value: '', label: 'Create New Template' },
            ...templates.map((template) => ({ value: template.templateId, label: template.name })),
          ]}
        />
        <Input
          value={form.name}
          placeholder="Template Name"
          onChange={(event) => onFormChange({ name: event.target.value })}
        />
        <Select
          value={form.eventType}
          onChange={(event) =>
            onFormChange({ eventType: event.target.value as TemplateFormState['eventType'] })
          }
          options={EVENT_OPTIONS.map((eventType) => ({ value: eventType, label: eventType }))}
        />
        <Select
          value={form.channel}
          onChange={(event) =>
            onFormChange({ channel: event.target.value as TemplateFormState['channel'] })
          }
          options={CHANNEL_OPTIONS.map((channel) => ({ value: channel, label: channel }))}
        />
        <Input
          value={form.subject}
          placeholder="Subject (Optional)"
          onChange={(event) => onFormChange({ subject: event.target.value })}
        />
      </div>
      <div className="mt-3 space-y-3">
        <Textarea
          value={form.content}
          placeholder="Template content. Use placeholders like {{ticketNumber}}"
          onChange={(event) => onFormChange({ content: event.target.value })}
          rows={4}
        />
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => onFormChange({ active: event.target.checked })}
          />
          <span>Active</span>
        </label>
        <div className="flex justify-end">
          <Button onClick={onSave} loading={saving}>
            {selectedTemplateId ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
