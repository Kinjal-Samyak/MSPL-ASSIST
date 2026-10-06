import { Badge, Button, Card, CardHeader, CardTitle, Input } from '@/components/ui';
import { Drawer, Tabs } from '@/components/layout';
import { ErrorState, Loader } from '@/components/feedback';
import type {
  WorkshopAttachmentsResponse,
  WorkshopJobDetailResponse,
  WorkshopPartsResponse,
  WorkshopTimelineResponse,
} from '@/services/workshopService';
import { formatDateTime } from '@/utils';

interface WorkshopDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  detail: WorkshopJobDetailResponse | null;
  timeline: WorkshopTimelineResponse | null;
  parts: WorkshopPartsResponse | null;
  attachments: WorkshopAttachmentsResponse | null;
  technicianId: string;
  onTechnicianIdChange: (value: string) => void;
  onRetry: () => void;
  onAssign: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  saving: boolean;
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding="sm" className="rounded-lg border-gray-200/80 dark:border-gray-800/80">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </Card>
  );
}

export function WorkshopDetailsDrawer({
  isOpen,
  onClose,
  loading,
  error,
  detail,
  timeline,
  parts,
  attachments,
  technicianId,
  onTechnicianIdChange,
  onRetry,
  onAssign,
  onStart,
  onComplete,
  onCancel,
  saving,
}: WorkshopDetailsDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={detail?.ticketNumber ?? 'Workshop Job Details'}
      width="w-[680px]"
    >
      {loading ? (
        <Loader label="Loading workshop job details..." />
      ) : error !== '' ? (
        <ErrorState title="Failed to load workshop job details" message={error} onRetry={onRetry} />
      ) : !detail ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a job to view details.</p>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
            <CardHeader>
              <div>
                <CardTitle>{detail.ticketNumber}</CardTitle>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {detail.customerName} • {detail.vehicleNumber}
                </p>
              </div>
              <Badge
                variant={
                  detail.status === 'COMPLETED'
                    ? 'success'
                    : detail.status === 'CANCELLED'
                      ? 'danger'
                      : 'warning'
                }
              >
                {detail.status}
              </Badge>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="Priority" value={detail.priority} />
              <SummaryCard label="Issue Category" value={detail.issueCategory} />
              <SummaryCard label="Hub" value={detail.hubName} />
              <SummaryCard label="Technician" value={detail.technicianName ?? 'Unassigned'} />
              <SummaryCard label="Created At" value={formatDateTime(detail.createdAt)} />
              <SummaryCard label="Updated At" value={formatDateTime(detail.updatedAt)} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <Input
                placeholder="Technician Id"
                value={technicianId}
                onChange={(event) => onTechnicianIdChange(event.target.value)}
              />
              <Button variant="outline" size="sm" onClick={onAssign} loading={saving}>
                Assign Technician
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onStart} loading={saving}>
                Start
              </Button>
              <Button variant="primary" size="sm" onClick={onComplete} loading={saving}>
                Complete
              </Button>
              <Button variant="danger" size="sm" onClick={onCancel} loading={saving}>
                Cancel
              </Button>
            </div>
          </Card>

          <Tabs
            tabs={[
              {
                id: 'timeline',
                label: 'Timeline',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(timeline?.items ?? []).map((event) => (
                        <li
                          key={event.id}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {event.title} • {formatDateTime(event.occurredAt)}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            {event.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'parts',
                label: 'Parts Used',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(parts?.items ?? []).map((item) => (
                        <li
                          key={item.partId}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.issueCategory} • {item.issueStatus}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'attachments',
                label: 'Attachments',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(attachments?.items ?? []).map((item) => (
                        <li
                          key={item.attachmentId}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.fileName} • {item.fileType}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(item.uploadedAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'financials',
                label: 'Financials',
                content: (
                  <div className="grid grid-cols-1 gap-3">
                    <SummaryCard
                      label="Estimated Charges"
                      value={detail.estimatedCharges ?? 'NA'}
                    />
                    <SummaryCard label="Final Charges" value={detail.finalCharges ?? 'NA'} />
                    <SummaryCard label="Open Ticket Count" value={detail.openTicketCount} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}
