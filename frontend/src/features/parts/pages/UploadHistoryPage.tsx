import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@/components/ui';
import { Pagination } from '@/components/layout';
import { EmptyState, Loader } from '@/components/feedback';
import { ROUTES } from '@/constants';
import { toApiErrorMessage } from '@/services/apiService';
import { toast } from '@/utils';
import { partsService, type PartsInventoryUpload } from '@/services/partsService';

const PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadHistoryPage() {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<PartsInventoryUpload[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await partsService.listUploadHistory({
        page,
        pageSize: PAGE_SIZE,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(result.items);
      setTotalRecords(result.totalRecords);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(toApiErrorMessage(loadError));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [dateFrom, dateTo, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = async (upload: PartsInventoryUpload) => {
    setDownloadingId(upload.id);
    try {
      const blob = await partsService.downloadUpload(upload.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = upload.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      toast.error('Unable to download this upload', {
        description: toApiErrorMessage(downloadError),
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Parts module · Imports
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Upload History</h1>
          <p className="mt-2 text-sm text-slate-600">
            Every confirmed Parts Inventory Import, with the total value received and the original
            workbook available to re-download for verification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.PARTS_INVENTORY_IMPORT)}>
            New Import
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void load()}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error !== '' && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
              <tr>
                {[
                  'Date',
                  'File Name',
                  'Invoice #',
                  'Purchase Order',
                  'Uploaded By',
                  'Rows',
                  'Parts Created',
                  'Parts Updated',
                  'Qty Added',
                  'Total Value',
                  'Actions',
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11}>
                    <div className="py-10">
                      <Loader label="Loading upload history..." />
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState
                      title="No uploads found"
                      description="Confirmed Parts Inventory imports will appear here."
                      className="py-10"
                    />
                  </td>
                </tr>
              ) : (
                items.map((upload) => (
                  <tr key={upload.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {new Date(upload.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      <p className="font-medium">{upload.fileName}</p>
                      <p className="text-xs text-slate-500">{formatBytes(upload.fileSizeBytes)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{upload.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{upload.poNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{upload.uploadedByName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {upload.successfulRows}/{upload.totalRows}
                      {upload.failedRows > 0 && (
                        <span className="ml-1 text-danger">({upload.failedRows} failed)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{upload.partsCreated}</td>
                    <td className="px-4 py-3 text-slate-700">{upload.partsUpdated}</td>
                    <td className="px-4 py-3 text-slate-700">{upload.totalQuantityAdded}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      ₹{Number(upload.totalValue).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Download className="h-4 w-4" />}
                        onClick={() => void handleDownload(upload)}
                        loading={downloadingId === upload.id}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination total={totalRecords} page={page} perPage={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
