import { useEffect, useState } from 'react';
import { CheckCircle2, IndianRupee, Printer, Wallet } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { ticketService } from '@/services/ticketService';
import { toApiErrorMessage } from '@/services/apiService';

export interface TicketClosePaymentPayload {
  remarks: string;
  paymentMode: 'NEFT' | 'UPI';
  utrNumber: string;
  amount: number;
}

interface TicketClosePaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: TicketClosePaymentPayload) => Promise<void> | void;
  ticketId: string;
  chargesIncurred?: string | number | null;
  /** Final Spare Part Billing (Amendment 2) - the frozen, consumed-quantity-only amount read
   * straight from the Job Card's billing snapshot. Read-only: never recalculated here, only
   * displayed. Null until the Service Engineer has clicked Ready for Deployment. */
  finalSparePartsAmount?: string | null;
  busy?: boolean;
  requireRemarks?: boolean;
}

export function TicketClosePaymentDialog({
  isOpen,
  onClose,
  onConfirm,
  ticketId,
  chargesIncurred,
  finalSparePartsAmount,
  busy = false,
  requireRemarks = false,
}: TicketClosePaymentDialogProps) {
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'UPI' | ''>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentMode('');
      setUtrNumber('');
      setAmount(chargesIncurred != null ? String(chargesIncurred) : '');
      setRemarks('');
      setError('');
      setHasPrinted(false);
    }
  }, [isOpen, chargesIncurred]);

  const handleConfirm = async () => {
    if (!hasPrinted) {
      setError('Print the delivery note at least once before closing the ticket.');
      return;
    }
    if (requireRemarks && !remarks.trim()) {
      setError('Closure remarks are required.');
      return;
    }
    if (paymentMode === '') {
      setError('Select a payment mode.');
      return;
    }
    if (!utrNumber.trim()) {
      setError('UTR number is required.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    setError('');
    await onConfirm({
      remarks: remarks.trim(),
      paymentMode,
      utrNumber: utrNumber.trim(),
      amount: parsedAmount,
    });
  };

  const handlePrint = async () => {
    setPrinting(true);
    setError('');
    try {
      const blob = await ticketService.downloadDeliveryNote(ticketId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setHasPrinted(true);
    } catch (printError) {
      setError(toApiErrorMessage(printError));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close Ticket" size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-success dark:bg-emerald-500/20 dark:text-emerald-300">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-success dark:text-emerald-300">
                Charges Incurred
              </p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {chargesIncurred != null ? `₹${chargesIncurred}` : 'Not recorded'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Printer className="h-4 w-4" />}
            loading={printing}
            onClick={() => void handlePrint()}
          >
            Print Delivery Note
          </Button>
        </div>
        <p className="-mt-3 text-xs text-slate-400 dark:text-slate-500">
          Includes job summary, spare parts used, pre-delivery inspection checklist and a customer
          sign-off section.
        </p>

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

        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Wallet className="h-4 w-4 text-slate-400" />
            Payment Details
          </div>
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
          </div>
          <Input
            label="Amount Received"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            leftElement={<IndianRupee className="h-4 w-4" />}
            className="sm:max-w-xs"
          />
        </div>

        <Textarea
          label="Closure Remarks"
          aria-label="Closure remarks"
          placeholder={
            requireRemarks
              ? 'Required: describe how the ticket was closed'
              : 'Optional closure remarks'
          }
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          rows={3}
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col items-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {!hasPrinted && (
            <p className="text-xs text-warning dark:text-amber-400">
              Print the delivery note at least once to enable closing.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              loading={busy}
              disabled={!hasPrinted || busy}
              title={!hasPrinted ? 'Print the delivery note first' : undefined}
              onClick={() => void handleConfirm()}
            >
              Confirm and Close Ticket
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
