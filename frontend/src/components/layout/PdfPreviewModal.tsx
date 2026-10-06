import { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui';
import { Loader } from '@/components/feedback';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName: string;
  /** Lazily fetches the PDF blob - only called once, when the modal opens. */
  load: () => Promise<Blob>;
}

export function PdfPreviewModal({ isOpen, onClose, title, fileName, load }: PdfPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;

    let objectUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    setError('');
    load()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load the PDF preview.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [isOpen, load]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="2xl">
      <div className="flex h-[75vh] flex-col gap-3">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<ExternalLink className="h-4 w-4" />}
            disabled={!url}
            onClick={() => url && window.open(url, '_blank')}
          >
            Open in New Tab
          </Button>
          <Button
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            disabled={!url}
            onClick={() => {
              if (!url) return;
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = fileName;
              anchor.click();
            }}
          >
            Download
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader label="Loading PDF..." />
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full items-center justify-center text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {!loading && !error && url && (
            <iframe src={url} title={title} className="h-full w-full" />
          )}
        </div>
      </div>
    </Modal>
  );
}
