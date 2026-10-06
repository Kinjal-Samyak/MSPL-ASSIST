import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import {
  notificationService,
  type NotificationChannel,
  type NotificationDashboardResponse,
  type NotificationEventType,
  type NotificationItem,
  type NotificationSettingsResponse,
  type NotificationTemplate,
} from '@/services/notificationService';
import { formatDateTime } from '@/utils';
import {
  NotificationDashboard,
  NotificationDetailsDrawer,
  NotificationFilters,
  NotificationSettingsPanel,
  NotificationTable,
  NotificationTemplatesPanel,
} from '../components';
import type {
  NotificationFiltersState,
  NotificationSortState,
  SendNotificationFormState,
  TemplateFormState,
} from '../types/notification.types';

const PAGE_SIZE = 10;

const DEFAULT_DASHBOARD: NotificationDashboardResponse = {
  totalNotifications: 0,
  pendingNotifications: 0,
  sentNotifications: 0,
  failedNotifications: 0,
  unreadNotifications: 0,
  archivedNotifications: 0,
  totalTemplates: 0,
  activeChannels: 0,
};

const DEFAULT_FILTERS: NotificationFiltersState = {
  search: '',
  channel: '',
  status: '',
  eventType: '',
  archived: '',
};

const DEFAULT_SORT: NotificationSortState = {
  key: 'createdAt',
  direction: 'desc',
};

const DEFAULT_SEND_FORM: SendNotificationFormState = {
  eventType: 'TICKET_CREATED',
  sourceModule: 'TICKET',
  sourceEntityId: '',
  channel: 'WHATSAPP',
  recipient: '',
  templateId: '',
  message: '',
};

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  name: '',
  eventType: 'TICKET_CREATED',
  channel: 'WHATSAPP',
  subject: '',
  content: '',
  active: true,
};

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
const SOURCE_OPTIONS: SendNotificationFormState['sourceModule'][] = [
  'TICKET',
  'CUSTOMER',
  'VEHICLE',
  'DEPLOYMENT',
  'WORKSHOP',
  'ADMIN',
];
type NotificationTab = 'notifications' | 'templates' | 'settings';

export function NotificationsPage() {
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const [activeTab, setActiveTab] = useState<NotificationTab>('notifications');
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortState, setSortState] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [settings, setSettings] = useState<NotificationSettingsResponse>([]);
  const [sendForm, setSendForm] = useState(DEFAULT_SEND_FORM);
  const [templateForm, setTemplateForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailError, setDetailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    setLoadingPage(true);
    setErrorMessage('');
    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search: filters.search.trim() || undefined,
        channel: filters.channel || undefined,
        status: filters.status || undefined,
        eventType: filters.eventType || undefined,
        archived: filters.archived === '' ? false : filters.archived === 'false' ? undefined : true,
        sortBy: sortState.key,
        sortOrder: sortState.direction,
      };

      const [dashboardResponse, listResponse, templatesResponse, settingsResponse] =
        await Promise.all([
          notificationService.getDashboard(),
          notificationService.getNotificationList(query),
          notificationService.getTemplates(),
          notificationService.getSettings(),
        ]);

      if (requestId !== listRequestIdRef.current) return;

      setDashboard(dashboardResponse);
      setNotifications(
        listResponse.items.map((item) => ({
          ...item,
          createdAt: formatDateTime(item.createdAt),
          updatedAt: formatDateTime(item.updatedAt),
        }))
      );
      setTotalRecords(listResponse.totalRecords);
      setTemplates(
        templatesResponse.map((template) => ({
          ...template,
          createdAt: formatDateTime(template.createdAt),
          updatedAt: formatDateTime(template.updatedAt),
        }))
      );
      setSettings(
        settingsResponse.map((setting) => ({
          ...setting,
          updatedAt: formatDateTime(setting.updatedAt),
        }))
      );

      if (listResponse.items.length > 0 && !selectedNotificationId) {
        setSelectedNotificationId(listResponse.items[0].notificationId);
      }
    } catch (error) {
      if (requestId !== listRequestIdRef.current) return;
      setErrorMessage(toApiErrorMessage(error));
      setNotifications([]);
      setTotalRecords(0);
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoadingPage(false);
      }
    }
  }, [
    filters.archived,
    filters.channel,
    filters.eventType,
    filters.search,
    filters.status,
    page,
    selectedNotificationId,
    sortState.direction,
    sortState.key,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (successMessage === '') return undefined;
    const timeout = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const loadDetail = useCallback(async (notificationId: string) => {
    const requestId = ++detailRequestIdRef.current;
    setLoadingDetail(true);
    setDetailError('');
    try {
      const detail = await notificationService.getNotificationById(notificationId);
      if (requestId !== detailRequestIdRef.current) return;
      setSelectedNotification({
        ...detail,
        createdAt: formatDateTime(detail.createdAt),
        updatedAt: formatDateTime(detail.updatedAt),
      });
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) return;
      setDetailError(toApiErrorMessage(error));
      setSelectedNotification(null);
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setLoadingDetail(false);
      }
    }
  }, []);

  const runMutation = useCallback(
    async (handler: () => Promise<unknown>, successText: string) => {
      setSaving(true);
      setErrorMessage('');
      try {
        await handler();
        setSuccessMessage(successText);
        await loadData();
        if (selectedNotificationId && isDrawerOpen) {
          await loadDetail(selectedNotificationId);
        }
      } catch (error) {
        setErrorMessage(toApiErrorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [isDrawerOpen, loadData, loadDetail, selectedNotificationId]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.templateId === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateForm({
      name: selectedTemplate.name,
      eventType: selectedTemplate.eventType,
      channel: selectedTemplate.channel,
      subject: selectedTemplate.subject ?? '',
      content: selectedTemplate.content,
      active: selectedTemplate.active,
    });
  }, [selectedTemplate]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage notification delivery history, templates and channel settings
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadData()}
        >
          Refresh
        </Button>
      </div>

      {successMessage !== '' && (
        <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm text-success dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          {successMessage}
        </div>
      )}
      {errorMessage !== '' && (
        <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
          {errorMessage}
        </div>
      )}

      <NotificationDashboard {...dashboard} />

      <Card padding="md" className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Send Notification
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <Select
            value={sendForm.eventType}
            onChange={(event) =>
              setSendForm((current) => ({
                ...current,
                eventType: event.target.value as NotificationEventType,
              }))
            }
            options={EVENT_OPTIONS.map((eventType) => ({ value: eventType, label: eventType }))}
          />
          <Select
            value={sendForm.sourceModule}
            onChange={(event) =>
              setSendForm((current) => ({
                ...current,
                sourceModule: event.target.value as SendNotificationFormState['sourceModule'],
              }))
            }
            options={SOURCE_OPTIONS.map((source) => ({ value: source, label: source }))}
          />
          <Input
            value={sendForm.sourceEntityId}
            placeholder="Source Entity Id"
            onChange={(event) =>
              setSendForm((current) => ({ ...current, sourceEntityId: event.target.value }))
            }
          />
          <Select
            value={sendForm.channel}
            onChange={(event) =>
              setSendForm((current) => ({
                ...current,
                channel: event.target.value as NotificationChannel,
              }))
            }
            options={CHANNEL_OPTIONS.map((channel) => ({ value: channel, label: channel }))}
          />
          <Input
            value={sendForm.recipient}
            placeholder="Recipient"
            onChange={(event) =>
              setSendForm((current) => ({ ...current, recipient: event.target.value }))
            }
          />
          <Select
            value={sendForm.templateId}
            onChange={(event) =>
              setSendForm((current) => ({ ...current, templateId: event.target.value }))
            }
            options={[
              { value: '', label: 'No Template' },
              ...templates
                .filter((template) => template.channel === sendForm.channel)
                .map((template) => ({
                  value: template.templateId,
                  label: template.name,
                })),
            ]}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-4">
            <Textarea
              rows={3}
              value={sendForm.message}
              placeholder="Message (required when no template selected)"
              onChange={(event) =>
                setSendForm((current) => ({ ...current, message: event.target.value }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              loading={saving}
              onClick={() =>
                void runMutation(async () => {
                  await notificationService.sendNotification({
                    eventType: sendForm.eventType,
                    sourceModule: sendForm.sourceModule,
                    sourceEntityId: sendForm.sourceEntityId.trim(),
                    channel: sendForm.channel,
                    recipient: sendForm.recipient.trim(),
                    templateId: sendForm.templateId || undefined,
                    message: sendForm.message.trim() || undefined,
                  });
                  setSendForm(DEFAULT_SEND_FORM);
                }, 'Notification send request completed.')
              }
            >
              Send Notification
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['notifications', 'templates', 'settings'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'notifications'
              ? 'Notification History'
              : tab === 'templates'
                ? 'Templates'
                : 'Channel Settings'}
          </Button>
        ))}
      </div>

      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <NotificationFilters
            filters={filters}
            onChange={(updates) => {
              setFilters((current) => ({ ...current, ...updates }));
              setPage(1);
            }}
          />
          <NotificationTable
            rows={notifications}
            selectedNotificationId={selectedNotificationId}
            onSelectNotification={(item) => {
              setSelectedNotificationId(item.notificationId);
              setIsDrawerOpen(true);
              void loadDetail(item.notificationId);
            }}
            loading={loadingPage}
            page={page}
            perPage={PAGE_SIZE}
            total={totalRecords}
            onPageChange={setPage}
            sortState={sortState}
            onSortChange={(nextSort) => {
              setSortState(nextSort);
              setPage(1);
            }}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <NotificationTemplatesPanel
          templates={templates}
          form={templateForm}
          selectedTemplateId={selectedTemplateId}
          onFormChange={(updates) => setTemplateForm((current) => ({ ...current, ...updates }))}
          onSelectedTemplateChange={(templateId) => {
            setSelectedTemplateId(templateId);
            if (templateId === '') {
              setTemplateForm(DEFAULT_TEMPLATE_FORM);
            }
          }}
          onSave={() =>
            void runMutation(
              async () => {
                if (selectedTemplateId) {
                  await notificationService.updateTemplate(selectedTemplateId, {
                    name: templateForm.name.trim(),
                    channel: templateForm.channel,
                    content: templateForm.content.trim(),
                    eventType: templateForm.eventType,
                    subject: templateForm.subject.trim() || undefined,
                    active: templateForm.active,
                  });
                } else {
                  await notificationService.createTemplate({
                    name: templateForm.name.trim(),
                    channel: templateForm.channel,
                    content: templateForm.content.trim(),
                    eventType: templateForm.eventType,
                    subject: templateForm.subject.trim() || undefined,
                    active: templateForm.active,
                  });
                }
                setSelectedTemplateId('');
                setTemplateForm(DEFAULT_TEMPLATE_FORM);
              },
              selectedTemplateId
                ? 'Template updated successfully.'
                : 'Template created successfully.'
            )
          }
          saving={saving}
        />
      )}

      {activeTab === 'settings' && (
        <NotificationSettingsPanel
          settings={settings}
          onChange={(channel, updates) =>
            setSettings((current) =>
              current.map((setting) =>
                setting.channel === channel ? { ...setting, ...updates } : setting
              )
            )
          }
          onSave={() =>
            void runMutation(
              () =>
                notificationService.updateSettings({
                  settings: settings.map((setting) => ({
                    channel: setting.channel,
                    enabled: setting.enabled,
                    maxRetries: setting.maxRetries,
                  })),
                }),
              'Notification settings updated successfully.'
            )
          }
          saving={saving}
        />
      )}

      <NotificationDetailsDrawer
        isOpen={isDrawerOpen}
        loading={loadingDetail}
        error={detailError}
        notification={selectedNotification}
        onRetry={() => {
          if (!selectedNotificationId) return;
          void loadDetail(selectedNotificationId);
        }}
        onClose={() => setIsDrawerOpen(false)}
        onMarkRead={() => {
          if (!selectedNotificationId) return;
          void runMutation(
            () => notificationService.markRead(selectedNotificationId),
            'Notification marked as read.'
          );
        }}
        onArchive={() => {
          if (!selectedNotificationId) return;
          void runMutation(
            () => notificationService.archive(selectedNotificationId),
            'Notification archived successfully.'
          );
        }}
        saving={saving}
      />
    </div>
  );
}
