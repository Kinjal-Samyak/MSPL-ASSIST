import { useState } from 'react';
import { Modal } from '@/components/layout';
import { Button, Textarea } from '@/components/ui';

interface DeactivateCustomerModalProps {
  isOpen: boolean;
  customerName: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function DeactivateCustomerModal({
  isOpen,
  customerName,
  loading,
  error,
  onClose,
  onConfirm,
}: DeactivateCustomerModalProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleConfirm = async () => {
    if (reason.trim().length < 5) {
      setValidationError('Please provide a deactivation reason with at least 5 characters.');
      return;
    }
    setValidationError('');
    await onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deactivate Rider" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You are about to deactivate <span className="font-semibold">{customerName}</span>. This
          action blocks new operations for this rider.
        </p>
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Enter deactivation reason"
        />
        {(validationError !== '' || error !== '') && (
          <p className="text-xs text-danger dark:text-red-400">{validationError || error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm} loading={loading}>
            Deactivate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
