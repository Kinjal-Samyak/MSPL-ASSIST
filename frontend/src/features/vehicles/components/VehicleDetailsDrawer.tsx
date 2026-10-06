import { Badge, Button, Card, CardHeader, CardTitle } from '@/components/ui';
import { Drawer, Tabs } from '@/components/layout';
import { ErrorState, Loader } from '@/components/feedback';
import type {
  VehicleCurrentDeployment,
  VehicleDeploymentHistoryResponse,
  VehicleDetailResponse,
  VehicleDocumentResponse,
  VehicleHealthSummaryResponse,
  VehicleServiceHistoryResponse,
  VehicleStatusSummaryResponse,
  VehicleTimelineResponse,
} from '@/services/vehicleService';
import { formatDateTime } from '@/utils';

interface VehicleDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  detail: VehicleDetailResponse | null;
  timeline: VehicleTimelineResponse | null;
  currentDeployment: VehicleCurrentDeployment | null;
  deploymentHistory: VehicleDeploymentHistoryResponse | null;
  serviceHistory: VehicleServiceHistoryResponse | null;
  documents: VehicleDocumentResponse | null;
  statusSummary: VehicleStatusSummaryResponse | null;
  healthSummary: VehicleHealthSummaryResponse | null;
  onRetry: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
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

export function VehicleDetailsDrawer({
  isOpen,
  onClose,
  loading,
  error,
  detail,
  timeline,
  currentDeployment,
  deploymentHistory,
  serviceHistory,
  documents,
  statusSummary,
  healthSummary,
  onRetry,
  onActivate,
  onDeactivate,
  saving,
}: VehicleDetailsDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={detail?.vehicleNumber ?? 'Vehicle Details'}
      width="w-[640px]"
    >
      {loading ? (
        <Loader label="Loading vehicle details..." />
      ) : error !== '' ? (
        <ErrorState title="Failed to load vehicle details" message={error} onRetry={onRetry} />
      ) : !detail ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a vehicle to view details.
        </p>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
            <CardHeader>
              <div>
                <CardTitle>{detail.vehicleNumber}</CardTitle>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {detail.mvTrackNumber}
                </p>
              </div>
              <Badge
                variant={
                  detail.status === 'DEPLOYED'
                    ? 'warning'
                    : detail.status === 'AVAILABLE'
                      ? 'success'
                      : 'default'
                }
              >
                {detail.status}
              </Badge>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="VIN" value={detail.vin ?? 'NA'} />
              <SummaryCard label="Registration" value={detail.registrationNumber ?? 'NA'} />
              <SummaryCard label="Model" value={detail.modelName ?? 'NA'} />
              <SummaryCard label="Model Code" value={detail.modelCode ?? 'NA'} />
              <SummaryCard label="Hub" value={detail.hubName ?? 'NA'} />
              <SummaryCard label="Rider" value={detail.currentRiderName ?? 'NA'} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onActivate} loading={saving}>
                Activate
              </Button>
              <Button variant="danger" size="sm" onClick={onDeactivate} loading={saving}>
                Deactivate
              </Button>
            </div>
          </Card>

          <Tabs
            tabs={[
              {
                id: 'deployment',
                label: 'Deployment',
                content: (
                  <div className="space-y-3">
                    <SummaryCard
                      label="Current Deployment"
                      value={
                        currentDeployment
                          ? `${currentDeployment.customerName} • ${currentDeployment.hubName} • ${currentDeployment.rentalStatus}`
                          : 'No active deployment'
                      }
                    />
                    <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                      <CardTitle className="mb-3">Deployment History</CardTitle>
                      <ul className="space-y-2">
                        {(deploymentHistory?.items ?? []).map((item) => (
                          <li
                            key={item.deploymentId}
                            className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                          >
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {item.customerName} • {item.rentalStatus}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.hubName} • {formatDateTime(item.startedAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                ),
              },
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
                id: 'service',
                label: 'Service',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(serviceHistory?.items ?? []).map((item) => (
                        <li
                          key={item.ticketId}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.ticketNumber} • {item.issueCategory}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.status} • {formatDateTime(item.servicedAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'documents',
                label: 'Documents',
                content: (
                  <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80">
                    <ul className="space-y-2">
                      {(documents?.items ?? []).map((item) => (
                        <li
                          key={item.documentId}
                          className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {item.fileName} • {item.fileType}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Ticket {item.ticketNumber} • {formatDateTime(item.uploadedAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ),
              },
              {
                id: 'status-health',
                label: 'Status & Health',
                content: (
                  <div className="grid grid-cols-1 gap-3">
                    <SummaryCard label="Open Tickets" value={statusSummary?.openTicketCount ?? 0} />
                    <SummaryCard
                      label="Latest Service"
                      value={
                        statusSummary?.latestServiceAt
                          ? formatDateTime(statusSummary.latestServiceAt)
                          : 'NA'
                      }
                    />
                    <SummaryCard
                      label="Warranty Valid"
                      value={healthSummary?.warrantyValid ? 'Yes' : 'No'}
                    />
                    <SummaryCard
                      label="Insurance Valid"
                      value={healthSummary?.insuranceValid ? 'Yes' : 'No'}
                    />
                    <SummaryCard
                      label="Registration Valid"
                      value={healthSummary?.registrationValid ? 'Yes' : 'No'}
                    />
                    <SummaryCard
                      label="IoT Connected"
                      value={healthSummary?.hasIotConnectivity ? 'Yes' : 'No'}
                    />
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
