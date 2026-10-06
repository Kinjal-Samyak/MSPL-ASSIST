import { Badge, Button, Card, CardHeader, CardTitle } from '@/components/ui';
import { Drawer, Tabs } from '@/components/layout';
import { ErrorState, Loader } from '@/components/feedback';
import type {
  DeploymentDetailResponse,
  DeploymentHistoryResponse,
  DeploymentPaymentsResponse,
  DeploymentStatusResponse,
  DeploymentTimelineResponse,
} from '@/services/deploymentService';
import { formatDateTime } from '@/utils';

interface DeploymentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  detail: DeploymentDetailResponse | null;
  timeline: DeploymentTimelineResponse | null;
  payments: DeploymentPaymentsResponse | null;
  history: DeploymentHistoryResponse | null;
  status: DeploymentStatusResponse | null;
  onRetry: () => void;
  onCloseDeployment: () => void;
  onReopenDeployment: () => void;
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

export function DeploymentDetailsDrawer({
  isOpen,
  onClose,
  loading,
  error,
  detail,
  timeline,
  payments,
  history,
  status,
  onRetry,
  onCloseDeployment,
  onReopenDeployment,
  saving,
}: DeploymentDetailsDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={detail?.deploymentId ?? 'Deployment Details'}
      width="w-[680px]"
    >
      {loading ? (
        <Loader label="Loading deployment details..." />
      ) : error !== '' ? (
        <ErrorState title="Failed to load deployment details" message={error} onRetry={onRetry} />
      ) : !detail ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a deployment to view details.
        </p>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
            <CardHeader>
              <div>
                <CardTitle>{detail.customerName}</CardTitle>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {detail.deploymentId} • {detail.vehicleNumber}
                </p>
              </div>
              <Badge variant={detail.rentalStatus === 'ACTIVE' ? 'success' : 'default'}>
                {detail.rentalStatus}
              </Badge>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="MV Track" value={detail.mvTrackNumber} />
              <SummaryCard label="Hub" value={detail.hubName} />
              <SummaryCard label="Model" value={detail.modelName} />
              <SummaryCard label="Model Code" value={detail.modelCode ?? 'NA'} />
              <SummaryCard label="Vehicle VIN" value={detail.vehicleVin ?? 'NA'} />
              <SummaryCard label="Rider Phone" value={detail.riderPhone} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="danger" size="sm" onClick={onCloseDeployment} loading={saving}>
                Close Deployment
              </Button>
              <Button variant="outline" size="sm" onClick={onReopenDeployment} loading={saving}>
                Reopen Deployment
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
                id: 'payments',
                label: 'Payments',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(payments?.items ?? []).map((item) => (
                        <li
                          key={item.paymentId}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.ticketNumber} • Estimated: {item.estimatedCharges ?? 'NA'} •
                            Final: {item.finalCharges ?? 'NA'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.status} • {formatDateTime(item.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'history',
                label: 'History',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(history?.items ?? []).map((item) => (
                        <li
                          key={item.id}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.oldStatus ?? 'N/A'} → {item.newStatus}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.updatedBy ?? 'System'} • {formatDateTime(item.updatedAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'status',
                label: 'Status',
                content: (
                  <div className="grid grid-cols-1 gap-3">
                    <SummaryCard label="Rental Status" value={status?.rentalStatus ?? 'NA'} />
                    <SummaryCard
                      label="Latest Ticket Status"
                      value={status?.latestTicketStatus ?? 'NA'}
                    />
                    <SummaryCard label="Open Tickets" value={status?.openTicketCount ?? 0} />
                    <SummaryCard label="Can Close" value={status?.canClose ? 'Yes' : 'No'} />
                    <SummaryCard label="Can Reopen" value={status?.canReopen ? 'Yes' : 'No'} />
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
