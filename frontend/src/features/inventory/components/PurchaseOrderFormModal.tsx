import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { partsService, type Part } from '@/services/partsService';
import {
  procurementService,
  type PurchaseOrder,
  type Supplier,
} from '@/services/procurementService';

interface PurchaseOrderFormModalProps {
  /** Non-null opens the modal in edit mode for this (DRAFT-only) purchase order. */
  purchaseOrder?: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchaseOrder: PurchaseOrder) => void;
}

interface LineRow {
  partId: string;
  orderedQuantity: string;
  unitCost: string;
}

const EMPTY_LINE: LineRow = { partId: '', orderedQuantity: '', unitCost: '' };

export function PurchaseOrderFormModal({
  purchaseOrder,
  isOpen,
  onClose,
  onSuccess,
}: PurchaseOrderFormModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineRow[]>([EMPTY_LINE]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(purchaseOrder);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    Promise.all([
      procurementService.listSuppliers({ page: 1, pageSize: 200, active: true }),
      partsService.listCatalog({ active: true }),
    ])
      .then(([supplierResult, partResult]) => {
        setSuppliers(supplierResult.items);
        setParts(partResult);
      })
      .catch(() => {
        setSuppliers([]);
        setParts([]);
      });

    if (purchaseOrder) {
      setSupplierId(purchaseOrder.supplierId);
      setExpectedDeliveryDate(
        purchaseOrder.expectedDeliveryDate ? purchaseOrder.expectedDeliveryDate.slice(0, 10) : ''
      );
      setRemarks(purchaseOrder.remarks ?? '');
      setLines(
        purchaseOrder.lines.map((line) => ({
          partId: line.partId,
          orderedQuantity: String(line.orderedQuantity),
          unitCost: line.unitCost,
        }))
      );
    } else {
      setSupplierId('');
      setExpectedDeliveryDate('');
      setRemarks('');
      setLines([EMPTY_LINE]);
    }
  }, [isOpen, purchaseOrder]);

  const updateLine = (index: number, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const total = lines.reduce(
    (sum, line) => sum + (Number(line.orderedQuantity) || 0) * (Number(line.unitCost) || 0),
    0
  );

  const handleSubmit = async () => {
    setError('');
    if (!supplierId) {
      setError('Select a supplier.');
      return;
    }
    const parsedLines = lines.filter((line) => line.partId);
    if (parsedLines.length === 0) {
      setError('Add at least one line.');
      return;
    }
    for (const line of parsedLines) {
      const qty = Number(line.orderedQuantity);
      const cost = Number(line.unitCost);
      if (!Number.isInteger(qty) || qty <= 0) {
        setError('Every line needs a whole-number quantity greater than zero.');
        return;
      }
      if (!Number.isFinite(cost) || cost <= 0) {
        setError('Every line needs a unit cost greater than zero.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        remarks: remarks.trim() || undefined,
        lines: parsedLines.map((line) => ({
          partId: line.partId,
          orderedQuantity: Number(line.orderedQuantity),
          unitCost: Number(line.unitCost),
        })),
      };
      const result =
        isEdit && purchaseOrder
          ? await procurementService.updatePurchaseOrder(purchaseOrder.id, payload)
          : await procurementService.createPurchaseOrder(payload);
      toast.success(isEdit ? 'Purchase order updated.' : 'Purchase order created (DRAFT).');
      onSuccess(result);
      onClose();
    } catch (submitError) {
      const message = toApiErrorMessage(submitError);
      setError(message);
      toast.error(isEdit ? 'Unable to update purchase order' : 'Unable to create purchase order', {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Purchase Order - ${purchaseOrder?.poNumber}` : 'New Purchase Order'}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Supplier"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            placeholder="Select a supplier"
            options={suppliers.map((supplier) => ({
              value: supplier.id,
              label: `${supplier.supplierCode} - ${supplier.name}`,
            }))}
          />
          <Input
            label="Expected Delivery (optional)"
            type="date"
            value={expectedDeliveryDate}
            onChange={(event) => setExpectedDeliveryDate(event.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Lines</p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setLines((prev) => [...prev, EMPTY_LINE])}
            >
              Add Line
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="flex items-end gap-2">
                <Select
                  value={line.partId}
                  onChange={(event) => updateLine(index, { partId: event.target.value })}
                  placeholder="Select a part"
                  options={parts.map((part) => ({
                    value: part.id,
                    label: `${part.partCode} - ${part.partName}`,
                  }))}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={line.orderedQuantity}
                  onChange={(event) => updateLine(index, { orderedQuantity: event.target.value })}
                  placeholder="Qty"
                  className="w-24"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitCost}
                  onChange={(event) => updateLine(index, { unitCost: event.target.value })}
                  placeholder="Unit Cost"
                  className="w-28"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(index)}
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm font-semibold text-slate-900">
            Total: ₹{total.toLocaleString('en-IN')}
          </p>
        </div>

        <Textarea
          label="Remarks (optional)"
          rows={2}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
        {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Purchase Order'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
