import { Download } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ReportExportFormat } from '@/services/reportService';

interface ReportExportToolbarProps {
  exporting: boolean;
  onExport: (format: ReportExportFormat) => void;
}

export function ReportExportToolbar({ exporting, onExport }: ReportExportToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['CSV', 'EXCEL', 'PDF'] as const).map((format) => (
        <Button
          key={format}
          size="sm"
          variant="outline"
          loading={exporting}
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => onExport(format)}
        >
          Export {format}
        </Button>
      ))}
    </div>
  );
}
