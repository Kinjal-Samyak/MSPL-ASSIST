import { useEffect, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Select, Textarea } from '@/components/ui';
import { formatDateTime } from '@/utils';
import { ticketService, type TicketPriorityChangeResponse } from '@/services/ticketService';
import { toApiErrorMessage } from '@/services/apiService';
import { useAuthStore } from '@/store/authStore';
import type { Ticket } from '@/features/tickets/types/ticket.types';
import { toBackendPriority } from '@/features/tickets/types/ticket.api';

interface TicketPriorityChangeActionProps {
  ticket: Ticket;
  onChanged?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'P1 · Critical' },
  { value: 'HIGH', label: 'P2 · High' },
  { value: 'MEDIUM', label: 'P3 · Medium' },
  { value: 'LOW', label: 'P4 · Low' },
];

export function TicketPriorityChangeAction({ ticket, onChanged }: TicketPriorityChangeActionProps) {
  const user = useAuthStore((state) => state.user);

  const [history, setHistory] = useState<TicketPriorityChangeResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<string>(toBackendPriority(ticket.priority));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    ticketService
      .listTicketPriorityChanges(ticket.id)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  const jobCardAssigned = ticket.jobCardStage !== null;
  const canChange =
    (user?.role === 'COORDINATOR' && ticket.serviceTlId === null) ||
    (user?.role === 'SERVICE_TL' && !jobCardAssigned && ticket.serviceTlId === user.id);

  const openModal = () => {
    setNewPriority(toBackendPriority(ticket.priority));
    setReason('');
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (reason.trim().length === 0) {
      setError('A reason is required to change ticket priority.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await ticketService.updateTicketPriority(ticket.id, {
        priority: newPriority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        reason: reason.trim(),
      });
      setModalOpen(false);
      onChanged?.();
    } catch (caughtError) {
      setError(toApiErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Priority
        </h4>
        {canChange && (
          <Button size="sm" variant="outline" onClick={openModal}>
            Change Priority
          </Button>
        )}
      </div>

      {!canChange && jobCardAssigned && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Locked — priority cannot be changed once a technician is assigned.
        </p>
      )}

      {history.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {history.map((change) => (
            <li key={change.id} className="text-xs text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-800 dark:text-gray-100">
                {change.previousPriority} → {change.newPriority}
              </span>{' '}
              by {change.changedByName} ({change.changedByRole.replace('_', ' ')}) ·{' '}
              {formatDateTime(change.createdAt)}
              <p className="text-gray-500 dark:text-gray-400">{change.reason}</p>
            </li>
          ))}
        </ul>
      )}
      {!historyLoading && history.length === 0 && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          No priority changes recorded.
        </p>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Change Ticket Priority"
        size="md"
      >
        <div className="space-y-3">
          <Select
            label="New Priority"
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value)}
            options={PRIORITY_OPTIONS}
          />
          <Textarea
            label="Reason"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why the priority is changing"
          />
          {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={() => void handleSave()}>
              Save Priority Change
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
