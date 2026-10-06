import { useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  partsService,
  type PartsCatalogImportPreview,
  type PartsCatalogImportSummary,
} from '@/services/partsService';
import { IssuesCard, Metric } from '@/features/parts/components/PartsImportShared';

function readWorkbook(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('The selected workbook could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function PartsMasterImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PartsCatalogImportPreview | null>(null);
  const [result, setResult] = useState<PartsCatalogImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.xlsx')) {
      setError('Select an Excel workbook in .xlsx format.');
      return;
    }
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    setConfirming(false);
    setError('');
  };

  const validate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      setPreview(await partsService.previewCatalogImport(await readWorkbook(file)));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'The workbook could not be validated.'
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      setResult(await partsService.confirmCatalogImport(preview.sessionId));
      setConfirming(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The Parts Master import could not be completed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setConfirming(false);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadTemplate = async () => {
    setLoading(true);
    setError('');
    try {
      const template = (await partsService.getImportTemplates()).find(
        (item) => item.type === 'CATALOG'
      );
      if (!template) throw new Error('The Parts Master template is unavailable.');
      const binary = atob(template.workbookBase64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = template.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The Parts Master template could not be downloaded.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Parts module · Imports
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Parts Master Import</h1>
          <p className="mt-2 text-sm text-slate-600">
            Validate a Parts Master workbook, review the result, then import valid rows only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={loading}
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => void downloadTemplate()}
          >
            Download template
          </Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.PARTS)}>
            Back to catalogue
          </Button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {!preview && !result && (
        <Card className="border-dashed border-slate-300">
          <div className="flex min-h-60 flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-blue-50 p-4 text-primary">
              <FileSpreadsheet className="h-9 w-9" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              Upload Parts Master workbook
            </h2>
            <p className="mt-2 max-w-lg text-sm text-slate-600">
              Only .xlsx workbooks using the approved Parts Master template can be imported.
            </p>
            <input
              ref={inputRef}
              aria-label="Select Parts Master workbook"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{file.name}</p>
                  <p className="text-xs text-slate-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  aria-label="Remove selected workbook"
                  onClick={reset}
                  className="ml-3 text-slate-500 hover:text-slate-950"
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
                Choose workbook
              </Button>
            )}
            {file && (
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => inputRef.current?.click()}>
                  Choose another
                </Button>
                <Button
                  loading={loading}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => void validate()}
                >
                  Validate workbook
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {preview && !result && (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Validation complete
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Review Parts Master import
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Nothing has been changed yet. Only valid rows will be persisted after
                  confirmation.
                </p>
              </div>
              <Button variant="outline" onClick={reset}>
                Choose another workbook
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Metric label="Total rows" value={preview.totalRecords} />
              <Metric label="Valid rows" value={preview.validRecords} tone="success" />
              <Metric
                label="Invalid rows"
                value={preview.invalidRecords}
                tone={preview.invalidRecords ? 'danger' : 'default'}
              />
              <Metric
                label="Warnings"
                value={preview.warnings.length}
                tone={preview.warnings.length ? 'warning' : 'default'}
              />
              <Metric label="Template version" value={preview.templateVersion ?? 'Not detected'} />
            </div>
          </Card>

          {preview.errors.length > 0 && (
            <IssuesCard title="Rows needing attention" issues={preview.errors} />
          )}

          <Card padding="none">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Preview data</h2>
              <p className="mt-1 text-sm text-slate-600">
                Showing the first {preview.previewData.length} parsed rows.
              </p>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                  <tr>
                    {[
                      'Part Code',
                      'Part Name',
                      'Part Category',
                      'Unit',
                      'Part Cost',
                      'Model Code',
                    ].map((label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewData.map((row, index) => (
                    <tr
                      key={`${String(row['Part Code'])}-${index}`}
                      className="border-t border-slate-200 text-slate-900"
                    >
                      <td className="px-4 py-3 font-medium">{String(row['Part Code'] ?? '')}</td>
                      <td className="px-4 py-3">{String(row['Part Name'] ?? '')}</td>
                      <td className="px-4 py-3">{String(row['Part Category'] ?? '')}</td>
                      <td className="px-4 py-3">{String(row.Unit ?? '')}</td>
                      <td className="px-4 py-3">{String(row['Part Cost'] ?? '')}</td>
                      <td className="px-4 py-3">{String(row['Model Code'] ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="border-blue-200 bg-blue-50/60">
            {!confirming ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-700">
                  Import {preview.validRecords} valid row{preview.validRecords === 1 ? '' : 's'}.
                  Invalid rows will be skipped.
                </p>
                <Button disabled={preview.validRecords === 0} onClick={() => setConfirming(true)}>
                  Review and confirm import
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-950">Confirm Parts Master import</h2>
                  <p className="mt-1 text-sm text-slate-700">
                    Valid records will create new parts or update parts with matching Part Codes.
                    This cannot be undone here.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={loading} onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                  <Button loading={loading} onClick={() => void confirmImport()}>
                    Confirm import
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {result && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-success" />
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Parts Master import completed
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                The import processed every valid row and reported any rows that could not be saved.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Rows processed" value={result.totalRows} />
            <Metric label="New parts" value={result.newPartsCreated} tone="success" />
            <Metric label="Parts updated" value={result.existingPartsUpdated} tone="success" />
            <Metric
              label="Failed rows"
              value={result.failedRows}
              tone={result.failedRows ? 'danger' : 'default'}
            />
          </div>
          {result.errors.length > 0 && (
            <div className="mt-6">
              <IssuesCard title="Rows not imported" issues={result.errors} />
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => navigate(ROUTES.PARTS)}>View catalogue</Button>
            <Button variant="outline" onClick={reset}>
              Import another workbook
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
