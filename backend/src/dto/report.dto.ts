export type SortOrder = "asc" | "desc";
export type ReportExportFormat = "CSV" | "EXCEL" | "PDF";

export interface ReportQueryDto {
  page: number;
  pageSize: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hubId?: string;
  vehicleModelId?: string;
  vehicle?: string;
  technicianId?: string;
  customerId?: string;
  rider?: string;
  status?: string;
  category?: string;
  /** Additive common filters (Reports Module V1.0) - not yet consumed by the legacy 7 report
   * query builders; wired in as each new report type that needs them is built. */
  priority?: string;
  subcategory?: string;
  ticketNumber?: string;
  jobCardNumber?: string;
  coordinatorId?: string;
  serviceTlId?: string;
  sortBy: string;
  sortOrder: SortOrder;
}

export interface ReportListResponseDto<T> {
  items: T[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ExecutiveKpiDto {
  fleetUtilization: number;
  revenue: number;
  processingFees: number;
  securityDeposits: number;
  openTickets: number;
  workshopJobs: number;
  deployments: number;
  customerCount: number;
  notificationFailures: number;
}

export interface ChartDataPointDto {
  label: string;
  value: number;
}

export interface ExecutiveDashboardDto {
  kpi: ExecutiveKpiDto;
  ticketTrend: ChartDataPointDto[];
  ticketsByStatus: ChartDataPointDto[];
  ticketsByCategory: ChartDataPointDto[];
  notificationsByChannel: ChartDataPointDto[];
}

export interface ReportDashboardDto {
  generatedAt: string;
  reports: Array<{
    reportKey: string;
    title: string;
    totalRecords: number;
  }>;
  supportedExports: ReportExportFormat[];
}

export interface TicketReportDto {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  vehicle: string | null;
  hubName: string | null;
  technicianName: string | null;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReportDto {
  customerId: string;
  name: string;
  mobile: string;
  status: string;
  activeDeployments: number;
  ticketsRaised: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleReportDto {
  deploymentId: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  vehicleModel: string;
  customerName: string;
  hubName: string;
  rentalStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentReportDto {
  deploymentId: string;
  customerName: string;
  vehicleNumber: string;
  vehicleModel: string;
  hubName: string;
  rentalStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopReportDto {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  vehicleNumber: string | null;
  technicianName: string | null;
  status: string;
  priority: string;
  eta: string | null;
  updatedAt: string;
}

export interface NotificationReportDto {
  notificationId: string;
  eventType: string;
  sourceModule: string;
  sourceEntityId: string;
  channel: string;
  recipient: string;
  status: string;
  retryCount: number;
  read: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportDto {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  active: boolean;
  hubNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportResponseDto {
  fileName: string;
  contentType: string;
  content: string;
}
