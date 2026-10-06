import { useEffect, useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Input, Textarea } from '@/components/ui';
import type { CustomerDetailResponse, CustomerMutationPayload } from '@/services/customerService';

interface CustomerFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialCustomer: CustomerDetailResponse | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: CustomerMutationPayload) => Promise<void>;
}

export function CustomerFormModal({
  isOpen,
  mode,
  initialCustomer,
  loading,
  error,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(initialCustomer?.customerName ?? '');
    setRegisteredMobile(initialCustomer?.registeredMobile ?? '');
    setAlternateMobile(initialCustomer?.alternateMobile ?? '');
    setWhatsAppNumber(initialCustomer?.whatsAppNumber ?? '');
    setEmail(initialCustomer?.email ?? '');
    setAddress(initialCustomer?.address ?? '');
    setValidationError('');
  }, [initialCustomer, isOpen]);

  const handleSubmit = async () => {
    if (customerName.trim().length < 3) {
      setValidationError('Rider name must be at least 3 characters.');
      return;
    }
    if (!/^\d{10,15}$/.test(registeredMobile.trim())) {
      setValidationError('Rider Phone Number must be 10 to 15 digits.');
      return;
    }

    setValidationError('');
    await onSubmit({
      customerName: customerName.trim(),
      registeredMobile: registeredMobile.trim(),
      alternateMobile: alternateMobile.trim() || undefined,
      whatsAppNumber: whatsAppNumber.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create Rider' : 'Edit Rider'}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Rider Name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
          <Input
            label="Rider Phone Number"
            value={registeredMobile}
            onChange={(event) => setRegisteredMobile(event.target.value)}
          />
          <Input
            label="Alternate Mobile"
            value={alternateMobile}
            onChange={(event) => setAlternateMobile(event.target.value)}
          />
          <Input
            label="WhatsApp Number"
            value={whatsAppNumber}
            onChange={(event) => setWhatsAppNumber(event.target.value)}
          />
          <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <Textarea
          label="Address"
          rows={3}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        {(validationError !== '' || error !== '') && (
          <p className="text-xs text-danger dark:text-red-400">{validationError || error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
