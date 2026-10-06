import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { technicianConsoleService } from '../services/technicianConsoleService';

const PHOTO_TYPE_OPTIONS = [
  { value: 'BEFORE_REPAIR', label: 'Before Repair' },
  { value: 'DURING_REPAIR', label: 'During Repair' },
  { value: 'AFTER_REPAIR', label: 'After Repair' },
  { value: 'DAMAGED_COMPONENT', label: 'Damaged Component' },
] as const;

type PhotoType = (typeof PHOTO_TYPE_OPTIONS)[number]['value'];

interface PhotoEvidencePanelProps {
  ticketId: string;
  photos: string[];
  editable: boolean;
  onAttached: () => void;
}

/** Displays existing rider/technician photo evidence (Ticket attachments) and, when the job card
 * is still editable, lets the Technician attach another photo reference via the existing
 * /technician/jobs/:ticketId/photos endpoint - unused by any screen until now. */
export function PhotoEvidencePanel({
  ticketId,
  photos,
  editable,
  onAttached,
}: PhotoEvidencePanelProps) {
  const [photoType, setPhotoType] = useState<PhotoType>('DURING_REPAIR');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAttach = async () => {
    if (!reference.trim()) return;
    setSaving(true);
    setError('');
    try {
      await technicianConsoleService.attachPhotoReference(ticketId, {
        photoType,
        reference: reference.trim(),
      });
      setReference('');
      toast.success('Photo reference attached.');
      onAttached();
    } catch (attachError) {
      const message = toApiErrorMessage(attachError);
      setError(message);
      toast.error('Unable to attach photo', { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {photos.length === 0 ? (
        <EmptyState
          icon={<ImageOff className="h-8 w-8" />}
          title="No photo evidence yet"
          className="py-8"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-slate-200"
            >
              <img src={url} alt="Job card evidence" className="h-24 w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      {editable && (
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <Select
            aria-label="Photo type"
            value={photoType}
            onChange={(event) => setPhotoType(event.target.value as PhotoType)}
            options={PHOTO_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            className="sm:w-48"
          />
          <Input
            aria-label="Photo reference URL"
            placeholder="Photo URL / reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="min-w-[200px] flex-1"
          />
          <Button
            size="sm"
            loading={saving}
            disabled={!reference.trim()}
            onClick={() => void handleAttach()}
          >
            Attach
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
