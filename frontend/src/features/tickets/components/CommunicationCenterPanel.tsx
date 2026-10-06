import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Lock, RefreshCw, Send } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Badge, Button, Select, Textarea } from '@/components/ui';
import type { BadgeVariant } from '@/types';
import { notificationService, type NotificationTemplate } from '@/services/notificationService';
import {
  COMMUNICATION_EVENT_LABELS,
  ticketCommunicationService,
  type CommunicationCenterEventType,
  type CommunicationHealth,
  type CommunicationRecipientType,
  type TicketCommunicationCenter,
} from '@/services/ticketCommunicationService';
import { toApiErrorMessage } from '@/services/apiService';
import { formatDateTime, toast } from '@/utils';

interface CommunicationCenterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  /** Coordinator/Admin can send + resend; Service Engineer/Technician get a read-only view. */
  readOnly?: boolean;
}

const HEALTH_META: Record<
  CommunicationHealth,
  { dot: string; variant: BadgeVariant; label: string }
> = {
  UP_TO_DATE: { dot: 'bg-emerald-500', variant: 'success', label: 'Up to date' },
  UPDATE_RECOMMENDED: { dot: 'bg-amber-500', variant: 'warning', label: 'Update recommended' },
  NOT_UPDATED: { dot: 'bg-red-500', variant: 'danger', label: 'Not updated' },
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  NOT_SENT: 'neutral',
  SENT: 'info',
  DELIVERED: 'success',
  READ: 'success',
  FAILED: 'danger',
};

function renderTemplatePreview(content: string, variables: Record<string, string>): string {
  return content.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_match, key: string) => variables[key] ?? `{{${key}}}`
  );
}

export function CommunicationCenterPanel({
  isOpen,
  onClose,
  ticketId,
  readOnly = false,
}: CommunicationCenterPanelProps) {
  const [center, setCenter] = useState<TicketCommunicationCenter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<CommunicationCenterEventType | ''>('');
  const [recipientType, setRecipientType] = useState<CommunicationRecipientType>('PRIMARY');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [centerData, templateList] = await Promise.all([
        ticketCommunicationService.getCommunicationCenter(ticketId),
        notificationService.getTemplates(),
      ]);
      setCenter(centerData);
      setTemplates(
        templateList.filter((template) => template.active && template.channel === 'WHATSAPP')
      );
      setSelectedEvent((current) => {
        if (current && centerData.events.find((event) => event.eventType === current)?.enabled)
          return current;
        return (
          centerData.suggestedEvent ??
          centerData.events.find((event) => event.enabled)?.eventType ??
          ''
        );
      });
    } catch (loadError) {
      setError(toApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setCustomMessage('');
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ticketId]);

  const enabledEvents = useMemo(
    () => (center?.events ?? []).filter((event) => event.enabled),
    [center]
  );
  const activeTemplate = templates.find((template) => template.eventType === selectedEvent) ?? null;
  const recipient =
    recipientType === 'ALTERNATE' ? (center?.alternatePhone ?? '') : (center?.primaryPhone ?? '');

  const previewVariables: Record<string, string> = {
    customerName: center?.customerName ?? '',
    ticketNumber: center?.ticketNumber ?? '',
    status: '',
    eta: '',
    totalCharges: '',
    customMessage,
  };

  const handleSend = async () => {
    if (!center || !selectedEvent) return;
    if (!recipient) {
      toast.error('No recipient number', {
        description:
          recipientType === 'ALTERNATE'
            ? 'This ticket has no alternate number on file.'
            : 'This ticket has no primary number on file.',
      });
      return;
    }
    if (selectedEvent === 'GENERAL_ANNOUNCEMENT' && !customMessage.trim()) {
      toast.error('Message required', {
        description: 'Enter the announcement text before sending.',
      });
      return;
    }
    setSending(true);
    try {
      await ticketCommunicationService.send(ticketId, {
        eventType: selectedEvent,
        recipient,
        recipientType,
        customMessage: selectedEvent === 'GENERAL_ANNOUNCEMENT' ? customMessage.trim() : undefined,
      });
      toast.success('Update sent', {
        description: `${COMMUNICATION_EVENT_LABELS[selectedEvent]} sent to ${center.customerName}.`,
      });
      setCustomMessage('');
      await load();
    } catch (sendError) {
      toast.error('Unable to send update', { description: toApiErrorMessage(sendError) });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (communicationId: string) => {
    setResendingId(communicationId);
    try {
      await ticketCommunicationService.resend(communicationId);
      toast.success('Message resent');
      await load();
    } catch (resendError) {
      toast.error('Unable to resend', { description: toApiErrorMessage(resendError) });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Communication Center" size="2xl">
      {loading && !center && (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading communication history…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-danger dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {center && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {center.customerName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {center.ticketNumber} · {center.primaryPhone}
                {center.alternatePhone ? ` · Alt: ${center.alternatePhone}` : ''}
              </p>
            </div>
            <Badge variant={HEALTH_META[center.health].variant}>
              <span
                className={`mr-1.5 inline-block h-2 w-2 rounded-full ${HEALTH_META[center.health].dot}`}
              />
              {HEALTH_META[center.health].label}
            </Badge>
          </div>

          {center.suggestedEvent && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary dark:text-blue-300">
                Suggested update
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {center.suggestedReason}
              </p>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSelectedEvent(center.suggestedEvent!)}
                >
                  Use {COMMUNICATION_EVENT_LABELS[center.suggestedEvent]}
                </Button>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Event timeline
            </p>
            <ul className="space-y-1.5">
              {center.events.map((event) => (
                <li
                  key={event.eventType}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  {event.enabled ? (
                    event.lastStatus ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    )
                  ) : (
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${event.enabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}
                      >
                        {COMMUNICATION_EVENT_LABELS[event.eventType]}
                      </span>
                      {event.lastStatus && (
                        <Badge variant={STATUS_VARIANT[event.lastStatus] ?? 'neutral'}>
                          {event.lastStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.enabled
                        ? event.lastSentAt
                          ? `Last sent ${formatDateTime(event.lastSentAt)} to ${event.lastRecipient}`
                          : 'Not sent yet'
                        : event.reason}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {!readOnly && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Send customer update
              </p>
              {enabledEvents.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No events are available to send for this ticket right now.
                </p>
              ) : (
                <>
                  <Select
                    label="Event"
                    value={selectedEvent}
                    onChange={(event) =>
                      setSelectedEvent(event.target.value as CommunicationCenterEventType)
                    }
                    options={enabledEvents.map((event) => ({
                      value: event.eventType,
                      label: COMMUNICATION_EVENT_LABELS[event.eventType],
                    }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={recipientType === 'PRIMARY' ? 'primary' : 'outline'}
                      onClick={() => setRecipientType('PRIMARY')}
                    >
                      Primary · {center.primaryPhone}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={recipientType === 'ALTERNATE' ? 'primary' : 'outline'}
                      disabled={!center.alternatePhone}
                      onClick={() => setRecipientType('ALTERNATE')}
                    >
                      {center.alternatePhone
                        ? `Alternate · ${center.alternatePhone}`
                        : 'No alternate number'}
                    </Button>
                  </div>
                  {selectedEvent === 'GENERAL_ANNOUNCEMENT' && (
                    <Textarea
                      label="Announcement message"
                      value={customMessage}
                      onChange={(event) => setCustomMessage(event.target.value)}
                      rows={3}
                      placeholder="Type the message to send to the customer"
                    />
                  )}
                  {activeTemplate ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Preview ({activeTemplate.name})
                      </p>
                      {renderTemplatePreview(activeTemplate.content, previewVariables)}
                    </div>
                  ) : selectedEvent && selectedEvent !== 'GENERAL_ANNOUNCEMENT' ? (
                    <p className="text-xs text-warning dark:text-amber-400">
                      No active WhatsApp template found for this event. Create one in the
                      Notifications module.
                    </p>
                  ) : null}
                  <Button
                    leftIcon={<Send className="h-4 w-4" />}
                    loading={sending}
                    disabled={!selectedEvent}
                    onClick={() => void handleSend()}
                  >
                    Send update
                  </Button>
                </>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Communication history
            </p>
            {center.history.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No communications have been sent for this ticket yet.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {center.history.map((item) => (
                  <li
                    key={item.communicationId}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {COMMUNICATION_EVENT_LABELS[item.eventType]}
                      </span>
                      <Badge variant={STATUS_VARIANT[item.status] ?? 'neutral'}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      To {item.recipient} ·{' '}
                      {item.sentAt ? formatDateTime(item.sentAt) : formatDateTime(item.createdAt)}
                      {item.sentByName ? ` · by ${item.sentByName}` : ''}
                    </p>
                    {item.errorMessage && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-danger dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" /> {item.errorMessage}
                      </p>
                    )}
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1"
                        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                        loading={resendingId === item.communicationId}
                        onClick={() => void handleResend(item.communicationId)}
                      >
                        Resend
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
