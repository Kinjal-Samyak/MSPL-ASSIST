import type { LucideIcon } from 'lucide-react';

export interface CoordinatorNavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}
export type ImportBatchStatus =
  'UPLOADED' | 'VALIDATED' | 'PREVIEWED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface CoordinatorImportError {
  id?: string;
  rowNumber: number;
  severity: 'WARNING' | 'ERROR';
  errorType: string;
  description: string;
  suggestedFix: string;
}

export interface CoordinatorImportPreviewRow {
  rowNumber: number;
  ticketNumber: string;
  customerName: string;
  mobileNumber: string;
  status: string;
  action: 'INSERT' | 'UPDATE' | 'DUPLICATE' | 'INVALID';
}

export interface CoordinatorImportBatch {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  worksheetName: string;
  status: ImportBatchStatus;
  rowsFound: number;
  rowsValid: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsDuplicate: number;
  rowsSkipped: number;
  rowsFailed: number;
  durationMs?: number | null;
  preview: { rows: CoordinatorImportPreviewRow[] };
  errors: CoordinatorImportError[];
  importedBy?: { name: string; email: string } | null;
  createdAt: string;
  committedAt?: string | null;
}
