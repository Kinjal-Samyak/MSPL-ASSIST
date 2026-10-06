import type { VehicleOperationalStatus } from '@/services/vehicleService';

export interface VehicleFiltersState {
  search: string;
  status: '' | VehicleOperationalStatus;
  hubName: string;
  modelCode: string;
}

export interface VehicleSortState {
  key: 'updatedAt' | 'vehicleNumber' | 'mvTrackNumber' | 'status' | 'hubName';
  direction: 'asc' | 'desc';
}
