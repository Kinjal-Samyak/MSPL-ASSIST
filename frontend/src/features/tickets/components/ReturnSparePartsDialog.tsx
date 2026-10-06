import { useEffect, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import {
  ticketService,
  type JobCardSparePartItem,
  type ReturnSparePartsToInventoryResult,
} from '@/services/ticketService';

interface ReturnSparePartsDialogProps {
  isOpen: boolean;
  ticketId: string | null;
  jobCardNumber?: string;
  spareParts: JobCardSparePartItem[];
  onClose: () => void;
  onSuccess: (result: ReturnSparePartsToInventoryResult) => void;
}

export function ReturnSparePartsDialog({
  isOpen,
  ticketId,
  jobCardNumber,
  spareParts,
  onClose,
  onSuccess,
}: ReturnSparePartsDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantities({});
      setError('');
    }
  }, [isOpen]);

  const returnableParts = spareParts.filter((part) => part.remainingReturnable > 0);

  const quantityFor = (partId: string) => quantities[partId] ?? '';

  const rows = returnableParts.map((part) => {
    const raw = quantityFor(part.partId);
    const qty = raw === '' ? 0 : Number(raw);
    const valid = Number.isInteger(qty) && qty >= 0 && qty <= part.remainingReturnable;
    const price = valid ? (qty * Number(part.partCost)).toFixed(2) : '—';
    return { part, qty, valid, price };
  });

  const total = rows.reduce(
    (sum, row) => (row.valid ? sum + row.qty * Number(row.part.partCost) : sum),
    0
  );

  const handleSubmit = async () => {
    if (!ticketId) return;
    setError('');

    if (rows.some((row) => !row.valid)) {
      setError(
        'Each quantity must be a whole number between 0 and the remaining returnable amount.'
      );
      return;
    }

    const items = rows
      .filter((row) => row.qty > 0)
      .map((row) => ({ partId: row.part.partId, returnQuantity: row.qty }));
    if (items.length === 0) {
      setError('Enter a quantity greater than zero for at least one part.');
      return;
    }

    setSaving(true);
    try {
      const result = await ticketService.returnSparePartsToInventory(ticketId, { items });
      toast.success('Parts returned to inventory');
      onSuccess(result);
      onClose();
    } catch (submitError) {
      const message = toApiErrorMessage(submitError);
      setError(message);
      toast.error('Unable to return parts', { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Return Unused Parts to Inventory${jobCardNumber ? ` — ${jobCardNumber}` : ''}`}
      size="lg"
    >
      <div className="space-y-4">
        {returnableParts.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            There are no approved parts with a returnable quantity remaining on this job card.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="pb-2 pr-3">Part</th>
                  <th className="pb-2 pr-3">Remaining</th>
                  <th className="pb-2 pr-3">Qty to return</th>
                  <th className="pb-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ part, price }) => (
                  <tr key={part.partId} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {part.partCode}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {part.partName}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                      {part.remainingReturnable}
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min={0}
                        max={part.remainingReturnable}
                        value={quantityFor(part.partId)}
                        onChange={(event) =>
                          setQuantities((prev) => ({ ...prev, [part.partId]: event.target.value }))
                        }
                        className="h-8 w-20 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 text-slate-600 dark:text-slate-300">₹{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-right text-sm font-medium text-slate-800 dark:text-slate-100">
              Total: ₹{total.toFixed(2)}
            </p>
          </div>
        )}
        {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {returnableParts.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSubmit()}
              loading={saving}
            >
              Add Back to Inventory
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
