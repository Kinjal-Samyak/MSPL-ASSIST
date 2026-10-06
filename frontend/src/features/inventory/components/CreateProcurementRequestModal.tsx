import { useEffect, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { partsService, type Part } from '@/services/partsService';
import { procurementService, type ProcurementRequest } from '@/services/procurementService';

interface CreateProcurementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: ProcurementRequest) => void;
}

export function CreateProcurementRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProcurementRequestModalProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPartId('');
    setQuantity('');
    setRemarks('');
    setError('');
    partsService
      .listCatalog({ active: true })
      .then(setParts)
      .catch(() => setParts([]));
  }, [isOpen]);

  const handleSubmit = async () => {
    setError('');
    const parsedQuantity = Number(quantity);
    if (!partId) {
      setError('Select a part.');
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError('Enter a whole number greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const result = await procurementService.createProcurementRequest({
        partId,
        requestedQuantity: parsedQuantity,
        reason: 'MANUAL',
        remarks: remarks.trim() || undefined,
      });
      toast.success('Procurement request raised successfully.');
      onSuccess(result);
      onClose();
    } catch (submitError) {
      const message = toApiErrorMessage(submitError);
      setError(message);
      toast.error('Unable to raise procurement request', { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Procurement Request" size="sm">
      <div className="space-y-4">
        <Select
          label="Part"
          value={partId}
          onChange={(event) => setPartId(event.target.value)}
          placeholder="Select a part"
          options={parts.map((part) => ({
            value: part.id,
            label: `${part.partCode} - ${part.partName} (${part.availableQuantity} in stock)`,
          }))}
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="e.g. 20"
        />
        <Textarea
          label="Remarks (optional)"
          rows={3}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
        {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={saving}>
            Raise Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
