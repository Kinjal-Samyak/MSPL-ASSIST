import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, Select } from '@/components/ui';
import { ErrorState, Loader } from '@/components/feedback';
import type {
  CustomerDetailResponse,
  CustomerDocumentResponse,
  CustomerRentalHistoryItem,
  CustomerRentalHistoryResponse,
  CustomerTimelineResponse,
} from '@/services/customerService';
import { formatDateTime } from '@/utils';

interface CustomerDetailsPanelProps {
  loading: boolean;
  error: string;
  detail: CustomerDetailResponse | null;
  timeline: CustomerTimelineResponse | null;
  rentalHistory: CustomerRentalHistoryResponse | null;
  activeVehicles: CustomerRentalHistoryItem[];
  documents: CustomerDocumentResponse | null;
  onRetry: () => void;
}

type CustomerDetailTab = 'profile' | 'timeline' | 'rental' | 'vehicles' | 'documents';

export function CustomerDetailsPanel({
  loading,
  error,
  detail,
  timeline,
  rentalHistory,
  activeVehicles,
  documents,
  onRetry,
}: CustomerDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<CustomerDetailTab>('profile');

  const tabOptions = useMemo(
    () => [
      { value: 'profile', label: 'Profile' },
      { value: 'timeline', label: 'Timeline' },
      { value: 'rental', label: 'Rental History' },
      { value: 'vehicles', label: 'Active Vehicles' },
      { value: 'documents', label: 'Documents' },
    ],
    []
  );

  if (loading) {
    return (
      <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
        <Loader label="Loading rider details..." />
      </Card>
    );
  }

  if (error !== '') {
    return (
      <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
        <ErrorState title="Failed to load rider details" message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a rider to view profile, vehicles, rentals, and timeline.
        </p>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
      <CardHeader>
        <div>
          <CardTitle>{detail.customerName}</CardTitle>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail.customerId}</p>
        </div>
      </CardHeader>

      <div className="space-y-4">
        <Select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as CustomerDetailTab)}
          options={tabOptions}
        />

        {activeTab === 'profile' && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Rider Phone Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.registeredMobile}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Alternate Mobile</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.alternateMobile ?? 'NA'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.whatsAppNumber ?? 'NA'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.email ?? 'NA'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Address</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.address ?? 'NA'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Active Deployments</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.activeDeploymentCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Open Tickets</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.openTicketCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Total Tickets</dt>
              <dd className="text-gray-900 dark:text-gray-100">{detail.totalTicketCount}</dd>
            </div>
          </dl>
        )}

        {activeTab === 'timeline' && (
          <ul className="space-y-2">
            {(timeline?.items ?? []).map((event) => (
              <li key={event.id} className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.title} • {formatDateTime(event.occurredAt)}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{event.description}</p>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'rental' && (
          <ul className="space-y-2">
            {(rentalHistory?.items ?? []).map((item) => (
              <li
                key={item.deploymentId}
                className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
              >
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {item.vehicleNumber} • {item.vehicleModel}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.hub} • {item.rentalStatus} • {formatDateTime(item.deployedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'vehicles' && (
          <ul className="space-y-2">
            {activeVehicles.map((vehicle) => (
              <li
                key={vehicle.vehicleNumber}
                className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
              >
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {vehicle.vehicleNumber} • {vehicle.vehicleModel}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {vehicle.hub} • {vehicle.rentalStatus} • {formatDateTime(vehicle.deployedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'documents' && (
          <ul className="space-y-2">
            {(documents?.items ?? []).map((item) => (
              <li
                key={item.documentId}
                className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
              >
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {item.fileName} • {item.fileType}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ticket {item.ticketNumber} • {formatDateTime(item.uploadedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
