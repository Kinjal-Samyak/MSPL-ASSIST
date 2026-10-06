import { useEffect, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { partsService, type Part, type PartAdjustmentResult } from '@/services/partsService';
import { adminService, type AdminHub } from '@/services/adminService';

interface AdjustStockModalProps {
  part: Part | null;
  onClose: () => void;
  onSuccess: (result: PartAdjustmentResult) => void;
}

type Direction = 'INCREASE' | 'DECREASE';

export function AdjustStockModal({ part, onClose, onSuccess }: AdjustStockModalProps) {
  const [direction, setDirection] = useState<Direction>('INCREASE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [hubId, setHubId] = useState('');
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!part) return;
    setDirection('INCREASE');
    setQuantity('');
    setReason('');
    setHubId('');
    setError('');
    adminService
      .getHubs()
      .then(setHubs)
      .catch(() => setHubs([]));
  }, [part]);

  if (!part) return null;

  const magnitude = Number(quantity);
  const isValidQuantity = Number.isInteger(magnitude) && magnitude > 0;

  const handleSubmit = async () => {
    setError('');
    if (!isValidQuantity) {
      setError('Enter a whole number greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required for every stock adjustment.');
      return;
    }

    setSaving(true);
    try {
      const quantityDelta = direction === 'INCREASE' ? magnitude : -magnitude;
      const result = await partsService.createAdjustment(part.id, {
        quantityDelta,
        reason: reason.trim(),
        hubId: hubId || undefined,
      });
      toast.success('Stock adjusted successfully.');
      onSuccess(result);
      onClose();
    } catch (submitError) {
      const message = toApiErrorMessage(submitError);
      setError(message);
      toast.error('Unable to adjust stock', { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={part !== null}
      onClose={onClose}
      title={`Adjust Stock - ${part.partCode}`}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Currently{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {part.availableQuantity}
          </span>{' '}
          {part.unitOfMeasure} available. This writes a permanent ledger entry - it cannot be
          undone, only corrected with another adjustment.
        </p>
        <Select
          label="Direction"
          value={direction}
          onChange={(event) => setDirection(event.target.value as Direction)}
          options={[
            { value: 'INCREASE', label: 'Increase stock' },
            { value: 'DECREASE', label: 'Decrease stock' },
          ]}
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="e.g. 5"
        />
        <Select
          label="Hub (optional)"
          value={hubId}
          onChange={(event) => setHubId(event.target.value)}
          placeholder="Not tagged to a hub"
          options={hubs.map((hub) => ({ value: hub.hubId, label: hub.name }))}
        />
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Cycle count correction, damaged in transit, audit adjustment"
        />
        {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={saving}>
            Save Adjustment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
