import { Card, Input, Select } from '@/components/ui';
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from '@/services/notificationService';
import type { NotificationFiltersState } from '../types/notification.types';

interface NotificationFiltersProps {
  filters: NotificationFiltersState;
  onChange: (updates: Partial<NotificationFiltersState>) => void;
}

const EVENT_OPTIONS: NotificationEventType[] = [
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

const CHANNEL_OPTIONS: NotificationChannel[] = ['WHATSAPP', 'SMS', 'EMAIL', 'IN_APP'];
const STATUS_OPTIONS: NotificationStatus[] = ['NOT_SENT', 'SENT', 'FAILED'];

export function NotificationFilters({ filters, onChange }: NotificationFiltersProps) {
  return (
    <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input
          value={filters.search}
          placeholder="Search recipient, message or source"
          onChange={(event) => onChange({ search: event.target.value })}
        />
        <Select
          value={filters.channel}
          placeholder="Channel"
          onChange={(event) =>
            onChange({ channel: event.target.value as NotificationChannel | '' })
          }
          options={[
            { value: '', label: 'All Channels' },
            ...CHANNEL_OPTIONS.map((channel) => ({ value: channel, label: channel })),
          ]}
        />
        <Select
          value={filters.status}
          placeholder="Status"
          onChange={(event) => onChange({ status: event.target.value as NotificationStatus | '' })}
          options={[
            { value: '', label: 'All Statuses' },
            ...STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
          ]}
        />
        <Select
          value={filters.eventType}
          placeholder="Event"
          onChange={(event) =>
            onChange({ eventType: event.target.value as NotificationEventType | '' })
          }
          options={[
            { value: '', label: 'All Events' },
            ...EVENT_OPTIONS.map((eventType) => ({ value: eventType, label: eventType })),
          ]}
        />
        <Select
          value={filters.archived}
          placeholder="Archived"
          onChange={(event) =>
            onChange({ archived: event.target.value as NotificationFiltersState['archived'] })
          }
          options={[
            { value: '', label: 'Active Only' },
            { value: 'true', label: 'Archived Only' },
            { value: 'false', label: 'Include All' },
          ]}
        />
      </div>
    </Card>
  );
}
