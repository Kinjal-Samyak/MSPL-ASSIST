export interface ServiceLossFiltersDto {
  from?: string;
  to?: string;
  hubId?: string;
  vehicleModelId?: string;
  serviceTlId?: string;
  technicianId?: string;
  status?: "OPEN" | "CLOSED";
}

export interface ServiceLossTicketRowDto {
  ticketId: string;
  ticketNumber: string;
  riderName: string;
  vehicleNumber: string | null;
  vehicleModelId: string;
  vehicleModel: string;
  hubId: string;
  hub: string;
  serviceTl: string | null;
  technician: string | null;
  createdAt: string;
  rfdAt: string | null;
  downtimeDays: number;
  dailyRental: number;
  serviceLoss: number;
  isOpen: boolean;
  slaTargetDays: number;
  slaStatus: "WITHIN" | "NEAR" | "BREACHED";
}

export interface ServiceLossByGroupRowDto {
  groupId: string;
  groupLabel: string;
  openTickets: number;
  totalTickets: number;
  averageDowntime: number;
  totalServiceLoss: number;
  percentageContribution: number;
}

export interface DowntimeByModelRowDto {
  vehicleModelId: string;
  vehicleModel: string;
  averageDowntime: number;
  slaTargetDays: number;
  slaStatus: "WITHIN" | "NEAR" | "BREACHED";
}

export interface SlaComplianceDto {
  totalTickets: number;
  withinSla: number;
  outsideSla: number;
  slaCompliancePercent: number;
  revenueLossDueToSlaBreach: number;
}

export interface MonthlyTrendPointDto {
  month: string;
  totalTickets: number;
  averageDowntime: number;
  monthlyServiceLoss: number;
  monthOnMonthGrowthPercent: number | null;
  averageServiceLossPerTicket: number;
}

export interface ServiceLossInsightDto {
  id: string;
  message: string;
}

export interface ServiceLossSummaryResponseDto {
  byVehicleModel: ServiceLossByGroupRowDto[];
  byHub: ServiceLossByGroupRowDto[];
  downtimeByModel: DowntimeByModelRowDto[];
  slaCompliance: SlaComplianceDto;
  monthlyTrend: MonthlyTrendPointDto[];
  insights: ServiceLossInsightDto[];
  generatedAt: string;
}

export interface ServiceLossDrilldownResponseDto {
  items: ServiceLossTicketRowDto[];
  totalRecords: number;
}
