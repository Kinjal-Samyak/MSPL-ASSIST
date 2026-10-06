import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { coordinatorService } from '../services/coordinatorService';
import type { CoordinatorImportBatch } from '../types/coordinator.types';

const steps = ['Choose file', 'Validate', 'Preview changes', 'Import records', 'Summary'];

export function CoordinatorExcelImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<CoordinatorImportBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectFile = (candidate?: File) => {
    setError(null);
    setBatch(null);
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please choose an .xlsx workbook.');
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setError('The workbook must be 10 MB or smaller.');
      return;
    }
    setFile(candidate);
  };
  const validate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      setBatch(await coordinatorService.uploadWorkbook(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The workbook could not be validated.');
    } finally {
      setLoading(false);
    }
  };
  const commit = async () => {
    if (!batch) return;
    setLoading(true);
    setError(null);
    try {
      setBatch(await coordinatorService.commitImport(batch.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The import could not be completed.');
    } finally {
      setLoading(false);
    }
  };
  const completed = batch?.status === 'COMPLETED';
  const activeStep = completed ? 4 : batch ? 2 : file ? 1 : 0;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">
          Coordinator module
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-50">Excel Import</h1>
        <p className="mt-2 text-sm text-slate-300">
          Validate the existing Service Register before safely importing valid records.
        </p>
      </header>
      <ol className="grid gap-2 sm:grid-cols-5" aria-label="Import progress">
        {steps.map((step, index) => (
          <li
            key={step}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${index <= activeStep ? 'border-warning/50 bg-warning/10 text-warning' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
          >
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950/50">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      {!batch && (
        <Card className="border-dashed border-slate-600 bg-slate-800/90">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files[0]);
            }}
            className="flex min-h-64 flex-col items-center justify-center text-center"
          >
            <div className="rounded-2xl bg-warning/10 p-4 text-warning">
              <FileSpreadsheet className="h-9 w-9" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-50">
              Upload Service Register workbook
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              Use the existing .xlsx file exactly as maintained by the service team. Maximum size:
              10 MB.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-left">
                <FileSpreadsheet className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  aria-label="Remove selected file"
                  className="ml-3 text-slate-400 hover:text-slate-100"
                  onClick={() => {
                    setFile(null);
                    inputRef.current && (inputRef.current.value = '');
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                className="mt-5"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => inputRef.current?.click()}
              >
                Choose Excel file
              </Button>
            )}
            <div className="mt-5">
              {file && (
                <Button
                  loading={loading}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={validate}
                >
                  Validate workbook
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
      {batch && (
        <ImportPreview
          batch={batch}
          loading={loading}
          onCommit={commit}
          onReset={() => {
            setBatch(null);
            setFile(null);
          }}
        />
      )}
    </div>
  );
}

function ImportPreview({
  batch,
  loading,
  onCommit,
  onReset,
}: {
  batch: CoordinatorImportBatch;
  loading: boolean;
  onCommit: () => void;
  onReset: () => void;
}) {
  const completed = batch.status === 'COMPLETED';
  const metrics = [
    ['Rows found', batch.rowsFound],
    ['New records', batch.rowsInserted],
    ['Updated records', batch.rowsUpdated],
    ['Duplicates', batch.rowsDuplicate],
    ['Invalid / skipped', batch.rowsSkipped],
    ['Failed', batch.rowsFailed],
  ];
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-warning">
              {completed ? 'Import summary' : 'Validation complete'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">{batch.fileName}</h2>
            <p className="mt-1 text-sm text-slate-300">
              Worksheet: {batch.worksheetName} · {batch.rowsValid} valid records ready for import
            </p>
          </div>
          {completed ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="h-5 w-5" />
              Import successful
            </div>
          ) : (
            <Button
              loading={loading}
              disabled={batch.rowsValid === 0}
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={onCommit}
            >
              Import all valid records
            </Button>
          )}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"
            >
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-50">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      {batch.errors.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-50">Validation findings</h3>
              <p className="mt-1 text-sm text-slate-300">
                Invalid rows are excluded. Warnings are retained in the audit trail.
              </p>
            </div>
            <button
              className="text-sm font-semibold text-warning hover:text-warning/80"
              onClick={() => void coordinatorService.downloadErrorReport(batch.id)}
            >
              Download CSV report
            </button>
          </div>
          <div className="mt-4 max-h-52 overflow-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Issue</th>
                  <th className="px-3 py-2">Suggested fix</th>
                </tr>
              </thead>
              <tbody>
                {batch.errors.slice(0, 50).map((issue, index) => (
                  <tr
                    key={`${issue.rowNumber}-${index}`}
                    className="border-t border-slate-800 text-slate-200"
                  >
                    <td className="px-3 py-2">{issue.rowNumber}</td>
                    <td className="px-3 py-2">
                      <p className={issue.severity === 'ERROR' ? 'text-danger' : 'text-warning'}>
                        {issue.errorType}
                      </p>
                      <p className="text-xs text-slate-400">{issue.description}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{issue.suggestedFix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="flex justify-end">
        <Button variant="outline" onClick={onReset}>
          {completed ? 'Import another workbook' : 'Cancel import'}
        </Button>
      </div>
    </div>
  );
}
