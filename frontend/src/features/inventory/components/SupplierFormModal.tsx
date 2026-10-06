import { useEffect, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { procurementService, type Supplier } from '@/services/procurementService';

interface SupplierFormModalProps {
  /** Non-null opens the modal in edit mode for this supplier; pass `undefined` for create mode. */
  supplier?: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

const EMPTY_FORM = {
  supplierCode: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
};

export function SupplierFormModal({
  supplier,
  isOpen,
  onClose,
  onSuccess,
}: SupplierFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(supplier);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm(
      supplier
        ? {
            supplierCode: supplier.supplierCode,
            name: supplier.name,
            contactPerson: supplier.contactPerson ?? '',
            phone: supplier.phone ?? '',
            email: supplier.email ?? '',
            address: supplier.address ?? '',
            gstNumber: supplier.gstNumber ?? '',
          }
        : EMPTY_FORM
    );
  }, [isOpen, supplier]);

  const handleSubmit = async () => {
    setError('');
    if (!form.supplierCode.trim() || !form.name.trim()) {
      setError('Supplier code and name are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplierCode: form.supplierCode.trim(),
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        gstNumber: form.gstNumber.trim() || undefined,
      };
      const result =
        isEdit && supplier
          ? await procurementService.updateSupplier(supplier.id, payload)
          : await procurementService.createSupplier(payload);
      toast.success(isEdit ? 'Supplier updated successfully.' : 'Supplier created successfully.');
      onSuccess(result);
      onClose();
    } catch (submitError) {
      const message = toApiErrorMessage(submitError);
      setError(message);
      toast.error(isEdit ? 'Unable to update supplier' : 'Unable to create supplier', {
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
      title={isEdit ? `Edit Supplier - ${supplier?.supplierCode}` : 'New Supplier'}
      size="md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Supplier Code"
            value={form.supplierCode}
            onChange={(event) => setForm((prev) => ({ ...prev, supplierCode: event.target.value }))}
            disabled={isEdit}
            placeholder="e.g. SUP-001"
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Contact Person"
            value={form.contactPerson}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, contactPerson: event.target.value }))
            }
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            label="GST Number"
            value={form.gstNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, gstNumber: event.target.value }))}
          />
        </div>
        <Input
          label="Address"
          value={form.address}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
        />
        {error !== '' && <p className="text-xs text-danger dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
