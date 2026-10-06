import type { RentalStatus } from '@/services/deploymentService';

export interface DeploymentFiltersState {
  search: string;
  rentalStatus: '' | RentalStatus;
  hubName: string;
  modelCode: string;
}

export interface DeploymentSortState {
  key:
    'updatedAt' | 'startedAt' | 'customerName' | 'vehicleNumber' | 'mvTrackNumber' | 'rentalStatus';
  direction: 'asc' | 'desc';
}
