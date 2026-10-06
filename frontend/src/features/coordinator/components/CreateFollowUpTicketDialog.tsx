import { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Button, Textarea } from '@/components/ui';

export interface FollowUpTicketSubmitPayload {
  issueDescription: string;
  remarks?: string;
}

interface CreateFollowUpTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: FollowUpTicketSubmitPayload) => Promise<void>;
  parentTicketNumber: string;
  customerName: string;
  vehicleNumber?: string | null;
  category: string;
  busy?: boolean;
}

export function CreateFollowUpTicketDialog({
  isOpen,
  onClose,
  onSubmit,
  parentTicketNumber,
  customerName,
  vehicleNumber,
  category,
  busy = false,
}: CreateFollowUpTicketDialogProps) {
  const [issueDescription, setIssueDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIssueDescription('');
      setRemarks('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!issueDescription.trim()) {
      setError('Describe the issue for this follow-up ticket.');
      return;
    }
    setError('');
    await onSubmit({
      issueDescription: issueDescription.trim(),
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Follow-up Ticket" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3 dark:border-blue-900/50 dark:bg-blue-500/10">
          <GitBranch className="mt-0.5 h-5 w-5 shrink-0 text-primary dark:text-blue-400" />
          <p className="text-sm text-primary dark:text-blue-200">
            {parentTicketNumber} has already been reopened once, so it can't be reopened again. This
            creates a new ticket linked to it as a follow-up, using the same rider, vehicle and
            issue category.
          </p>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Rider
            </p>
            <p className="text-slate-800 dark:text-slate-100">{customerName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Vehicle
            </p>
            <p className="text-slate-800 dark:text-slate-100">{vehicleNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Issue Category
            </p>
            <p className="text-slate-800 dark:text-slate-100">{category}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Parent Ticket
            </p>
            <p className="text-slate-800 dark:text-slate-100">{parentTicketNumber}</p>
          </div>
        </div>

        <Textarea
          label="Issue Description"
          placeholder="Required: describe the new issue for this follow-up ticket"
          value={issueDescription}
          onChange={(event) => setIssueDescription(event.target.value)}
          rows={3}
        />

        <Textarea
          label="Remarks (optional)"
          placeholder="Any additional context for this follow-up"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          rows={2}
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" loading={busy} onClick={() => void handleSubmit()}>
            Create Follow-up Ticket
          </Button>
        </div>
      </div>
    </Modal>
  );
}
