import { Table } from '@/components/tables';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import type { TableColumn } from '@/types';

interface ReportTableProps {
  title: string;
  rows: Record<string, unknown>[];
  loading: boolean;
}

function toTitleCase(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function ReportTable({ title, rows, loading }: ReportTableProps) {
  const first = rows[0] ?? {};
  const columns: TableColumn<Record<string, unknown>>[] = Object.keys(first).map((key) => ({
    key,
    header: toTitleCase(key),
    sortable: true,
  }));

  if (columns.length === 0) {
    columns.push({ key: 'noData', header: 'Data' });
  }

  const withFallback = rows.length > 0 ? rows : [{ noData: 'No rows available' }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <Table
        columns={columns}
        data={withFallback}
        loading={loading}
        rowKey={columns[0].key as string}
        pageSize={10}
        emptyTitle="No report data"
        emptyDescription="No records matched the selected filters."
      />
    </Card>
  );
}
