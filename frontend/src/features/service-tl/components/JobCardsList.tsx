import { DataTable, type DataTableColumn } from '@/components/data';
import { Badge } from '@/components/ui';
import type { Ticket } from '@/features/tickets/types/ticket.types';

interface JobCardsListProps {
  rows: Ticket[];
  loading: boolean;
  selectedTicketId: string | null;
  onSelectTicket: (ticket: Ticket) => void;
}

export function JobCardsList({
  rows,
  loading,
  selectedTicketId,
  onSelectTicket,
}: JobCardsListProps) {
  const columns: Array<DataTableColumn<Ticket>> = [
    {
      key: 'jobCardNumber',
      header: 'Job Card No',
      sortable: true,
      accessor: (row) => row.jobCardNumber ?? '',
      render: (row) => (
        <span className="font-semibold text-primary dark:text-blue-300">{row.jobCardNumber}</span>
      ),
    },
    {
      key: 'ticketNumber',
      header: 'Ticket No',
      sortable: true,
      accessor: (row) => row.ticketNumber,
    },
    { key: 'customer', header: 'Rider', sortable: true, accessor: (row) => row.customer },
    { key: 'vehicle', header: 'Vehicle', sortable: true, accessor: (row) => row.vehicle },
    { key: 'model', header: 'Model', sortable: true, accessor: (row) => row.model },
    {
      key: 'jobCardTechnicianName',
      header: 'Technician',
      sortable: true,
      accessor: (row) => row.jobCardTechnicianName ?? '',
      render: (row) => row.jobCardTechnicianName ?? 'Unassigned',
    },
    {
      key: 'jobCardEffectiveStatusLabel',
      header: 'Job Card Status',
      sortable: true,
      accessor: (row) => row.jobCardEffectiveStatusLabel ?? '',
      render: (row) => <Badge variant="warning">{row.jobCardEffectiveStatusLabel ?? '—'}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (row) => row.createdAt,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      loading={loading}
      onRowClick={onSelectTicket}
      selectedRowKey={selectedTicketId}
      emptyTitle="No job cards"
      emptyDescription="Job cards for your tickets will appear here once workshop work begins."
    />
  );
}
