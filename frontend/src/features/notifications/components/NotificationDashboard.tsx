import {
  Archive,
  Bell,
  Clock,
  FileText,
  MailWarning,
  Radio,
  Send,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { StatCard, type StatCardTone } from '@/components/ui';

interface NotificationDashboardProps {
  totalNotifications: number;
  pendingNotifications: number;
  sentNotifications: number;
  failedNotifications: number;
  unreadNotifications: number;
  archivedNotifications: number;
  totalTemplates: number;
  activeChannels: number;
}

const CARDS: Array<{
  key: keyof NotificationDashboardProps;
  label: string;
  icon: LucideIcon;
  tone: StatCardTone;
}> = [
  { key: 'totalNotifications', label: 'Total Notifications', icon: Bell, tone: 'blue' },
  { key: 'pendingNotifications', label: 'Pending', icon: Clock, tone: 'amber' },
  { key: 'sentNotifications', label: 'Sent', icon: Send, tone: 'emerald' },
  { key: 'failedNotifications', label: 'Failed', icon: XCircle, tone: 'rose' },
  { key: 'unreadNotifications', label: 'Unread', icon: MailWarning, tone: 'violet' },
  { key: 'archivedNotifications', label: 'Archived', icon: Archive, tone: 'slate' },
  { key: 'totalTemplates', label: 'Templates', icon: FileText, tone: 'cyan' },
  { key: 'activeChannels', label: 'Active Channels', icon: Radio, tone: 'indigo' },
];

export function NotificationDashboard(props: NotificationDashboardProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          value={props[card.key]}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </div>
  );
}
