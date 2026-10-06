import { Drawer } from '@/components/layout';
import { ErrorState, Loader } from '@/components/feedback';
import { Badge, Button } from '@/components/ui';
import type { NotificationItem } from '@/services/notificationService';

interface NotificationDetailsDrawerProps {
  isOpen: boolean;
  loading: boolean;
  error: string;
  notification: NotificationItem | null;
  onRetry: () => void;
  onClose: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  saving: boolean;
}

export function NotificationDetailsDrawer({
  isOpen,
  loading,
  error,
  notification,
  onRetry,
  onClose,
  onMarkRead,
  onArchive,
  saving,
}: NotificationDetailsDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notification Details" width="w-[560px]">
      {loading ? (
        <Loader label="Loading notification..." />
      ) : error !== '' ? (
        <ErrorState title="Failed to load notification" message={error} onRetry={onRetry} />
      ) : !notification ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a notification to view details.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {notification.eventType}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {notification.sourceModule}
                </p>
              </div>
              <Badge
                variant={
                  notification.status === 'SENT'
                    ? 'success'
                    : notification.status === 'FAILED'
                      ? 'danger'
                      : 'warning'
                }
              >
                {notification.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <span className="font-medium">Recipient:</span> {notification.recipient}
            </p>
            <p>
              <span className="font-medium">Channel:</span> {notification.channel}
            </p>
            <p>
              <span className="font-medium">Source Entity:</span> {notification.sourceEntityId}
            </p>
            <p>
              <span className="font-medium">Template:</span> {notification.templateId ?? '-'}
            </p>
            <p>
              <span className="font-medium">Retry Count:</span> {notification.retryCount}
            </p>
            <p>
              <span className="font-medium">Read:</span> {notification.read ? 'Yes' : 'No'}
            </p>
            <p>
              <span className="font-medium">Archived:</span> {notification.archived ? 'Yes' : 'No'}
            </p>
            <p>
              <span className="font-medium">Created:</span> {notification.createdAt}
            </p>
            <p>
              <span className="font-medium">Updated:</span> {notification.updatedAt}
            </p>
          </div>

          <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
            {notification.message}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={onMarkRead}
              loading={saving}
              disabled={notification.read}
            >
              Mark Read
            </Button>
            <Button
              variant="danger"
              onClick={onArchive}
              loading={saving}
              disabled={notification.archived}
            >
              Archive
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
