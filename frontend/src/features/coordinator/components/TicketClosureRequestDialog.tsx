import { useEffect, useState } from 'react';
import { AlertTriangle, Ban } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Button, Input, Select, Textarea } from '@/components/ui';

export type ClosureRequestType = 'CANCELLATION' | 'EARLY_CLOSURE';
export type ClosureReasonCategory =
  'ACCOUNT_CLOSURE' | 'VEHICLE_EXCHANGE' | 'VEHICLE_UPGRADE' | 'OTHER';

export interface ClosureRequestSubmitPayload {
  requestType: ClosureRequestType;
  reason: string;
  reasonCategory?: ClosureReasonCategory;
  paymentWaived: boolean;
  paymentWaiveRemarks?: string;
  paymentMode?: 'NEFT' | 'UPI';
  paymentUtrNumber?: string;
  paymentAmount?: number;
}

interface TicketClosureRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ClosureRequestSubmitPayload) => Promise<void>;
  requestType: ClosureRequestType;
  chargesIncurred?: string | number | null;
  /** Final Spare Part Billing (Amendment 2) - the frozen, consumed-quantity-only amount read
   * straight from the Job Card's billing snapshot. Read-only: the Coordinator never edits or
   * recalculates this, only the overall "Amount Received" below. Null until the Service Engineer
   * has clicked Ready for Deployment. */
  finalSparePartsAmount?: string | null;
  busy?: boolean;
}

const REASON_CATEGORY_OPTIONS: Array<{ value: ClosureReasonCategory; label: string }> = [
  { value: 'ACCOUNT_CLOSURE', label: 'Rider is closing their account' },
  { value: 'VEHICLE_EXCHANGE', label: 'Rider is exchanging the vehicle' },
  { value: 'VEHICLE_UPGRADE', label: 'Rider is upgrading the vehicle' },
  { value: 'OTHER', label: 'Other' },
];

export function TicketClosureRequestDialog({
  isOpen,
  onClose,
  onSubmit,
  requestType,
  chargesIncurred,
  finalSparePartsAmount,
  busy = false,
}: TicketClosureRequestDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonCategory, setReasonCategory] = useState<ClosureReasonCategory | ''>('');
  const [waivePayment, setWaivePayment] = useState(false);
  const [paymentWaiveRemarks, setPaymentWaiveRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'UPI' | ''>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const isCancellation = requestType === 'CANCELLATION';

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setReasonCategory('');
      setWaivePayment(false);
      setPaymentWaiveRemarks('');
      setPaymentMode('');
      setUtrNumber('');
      setAmount(chargesIncurred != null ? String(chargesIncurred) : '');
      setError('');
    }
  }, [isOpen, chargesIncurred]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }

    if (isCancellation) {
      setError('');
      await onSubmit({ requestType: 'CANCELLATION', reason: reason.trim(), paymentWaived: false });
      return;
    }

    if (!reasonCategory) {
      setError('Select why this ticket is closing early.');
      return;
    }

    if (waivePayment) {
      if (!paymentWaiveRemarks.trim()) {
        setError('A remark is required to waive payment capture.');
        return;
      }
      setError('');
      await onSubmit({
        requestType: 'EARLY_CLOSURE',
        reason: reason.trim(),
        reasonCategory,
        paymentWaived: true,
        paymentWaiveRemarks: paymentWaiveRemarks.trim(),
      });
      return;
    }

    if (paymentMode === '') {
      setError('Select a payment mode, or waive payment with a remark.');
      return;
    }
    if (!utrNumber.trim()) {
      setError('UTR number is required, or waive payment with a remark.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid payment amount, or waive payment with a remark.');
      return;
    }
    setError('');
    await onSubmit({
      requestType: 'EARLY_CLOSURE',
      reason: reason.trim(),
      reasonCategory,
      paymentWaived: false,
      paymentMode,
      paymentUtrNumber: utrNumber.trim(),
      paymentAmount: parsedAmount,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCancellation ? 'Request Cancellation' : 'Request Early Closure'}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3 dark:border-amber-900/50 dark:bg-amber-500/10">
          {isCancellation ? (
            <Ban className="mt-0.5 h-5 w-5 shrink-0 text-warning dark:text-amber-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning dark:text-amber-400" />
          )}
          <p className="text-sm text-warning dark:text-amber-200">
            {isCancellation
              ? 'This sends a request to the assigned Service Engineer for approval. The ticket is only cancelled once they approve it.'
              : 'This closes the ticket while the Job Card is left exactly as-is. Sent to the assigned Service Engineer for approval.'}
          </p>
        </div>

        {finalSparePartsAmount != null && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Final Spare Parts Amount
            </p>
            <p className="text-lg font-semibold text-slate-900">
              ₹{Number(finalSparePartsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Frozen on the Job Card at Ready for Deployment - based only on consumed quantity,
              read-only.
            </p>
          </div>
        )}

        <Textarea
          label={
            isCancellation
              ? 'Reason this ticket was created by mistake'
              : 'Reason for early closure'
          }
          placeholder={
            isCancellation
              ? 'Required: explain why this ticket should be cancelled'
              : 'Required: additional context for the Service Engineer'
          }
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
        />

        {!isCancellation && (
          <>
            <Select
              label="Reason Category"
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value as ClosureReasonCategory)}
              placeholder="Select a reason"
              options={REASON_CATEGORY_OPTIONS}
            />

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={waivePayment}
                  onChange={(event) => setWaivePayment(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600"
                />
                Waive payment capture for this closure
              </label>

              {waivePayment ? (
                <Textarea
                  aria-label="Payment waiver remarks"
                  placeholder="Required: why payment capture is being waived"
                  value={paymentWaiveRemarks}
                  onChange={(event) => setPaymentWaiveRemarks(event.target.value)}
                  rows={2}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Payment Mode"
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value as 'NEFT' | 'UPI')}
                    placeholder="Select payment mode"
                    options={[
                      { value: 'NEFT', label: 'NEFT' },
                      { value: 'UPI', label: 'UPI' },
                    ]}
                  />
                  <Input
                    label="UTR Number"
                    value={utrNumber}
                    onChange={(event) => setUtrNumber(event.target.value)}
                    placeholder="Enter the transaction UTR number"
                  />
                  <Input
                    label="Amount Received"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="sm:col-span-2 sm:max-w-xs"
                  />
                </div>
              )}
            </div>
          </>
        )}

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
            Submit for Service Engineer Approval
          </Button>
        </div>
      </div>
    </Modal>
  );
}
