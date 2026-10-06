import { useEffect, useState } from 'react';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { coordinatorService } from '../services/coordinatorService';
import type { CoordinatorImportBatch } from '../types/coordinator.types';

export function CoordinatorImportHistoryPage() {
  const [batches, setBatches] = useState<CoordinatorImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBatches(await coordinatorService.getImportHistory());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import history could not be loaded.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">
            Coordinator module
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-50">
            Import History
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Review every Service Register migration and its audit outcome.
          </p>
        </div>
        <Button
          variant="outline"
          loading={loading}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <Card padding="none">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-300">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading import history
          </div>
        ) : batches.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <History className="h-9 w-9 text-warning" />
            <p className="mt-3 font-semibold text-slate-100">No imports yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Completed and failed imports will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Import time</th>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Rows</th>
                  <th className="px-5 py-3">Inserted</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Failed</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-slate-700/70 text-slate-200">
                    <td className="px-5 py-4 whitespace-nowrap">
                      {new Date(batch.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-100">{batch.fileName}</p>
                      <p className="text-xs text-slate-400">{batch.worksheetName}</p>
                    </td>
                    <td className="px-5 py-4">{batch.rowsFound}</td>
                    <td className="px-5 py-4 text-success">{batch.rowsInserted}</td>
                    <td className="px-5 py-4 text-info">{batch.rowsUpdated}</td>
                    <td className="px-5 py-4 text-danger">{batch.rowsFailed}</td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          batch.status === 'COMPLETED'
                            ? 'success'
                            : batch.status === 'FAILED'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {batch.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
