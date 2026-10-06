import type { ReportTabKey } from '@/services/reportService';

export interface ReportsFilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  hubId: string;
  vehicleModelId: string;
  vehicle: string;
  technicianId: string;
  customerId: string;
  rider: string;
  status: string;
  category: string;
}

export interface ReportsSortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface ReportTabOption {
  key: ReportTabKey;
  label: string;
}
