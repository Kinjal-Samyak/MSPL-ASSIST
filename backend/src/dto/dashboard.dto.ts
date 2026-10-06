export interface DashboardSummaryQueryDto {
  from?: string;
  to?: string;
}

export interface DashboardKpiDto {
  value: number;
  deltaVsYesterdayPct: number | null;
  sparkline: number[];
}

export interface DashboardTrendPointDto {
  date: string;
  count: number;
}

export interface DashboardHubDto {
  hub: string;
  openTickets: number;
}

export interface DashboardCriticalTicketDto {
  id: string;
  ticketNumber: string;
  category: string;
  priority: string;
  createdAt: string;
  hub: string | null;
  vehicleNumber: string | null;
  eta: string | null;
}

export interface DashboardSummaryDto {
  openTickets: DashboardKpiDto;
  closedTickets: DashboardKpiDto;
  inProgress: DashboardKpiDto;
  waitingForParts: DashboardKpiDto;
  serviceLossToday: DashboardKpiDto;
  slaCompliance: {
    withinSla: number;
    breached: number;
    noSla: number;
    withinSlaPct: number;
  };
  ticketsTrend: DashboardTrendPointDto[];
  topHubs: DashboardHubDto[];
  recentCriticalTickets: DashboardCriticalTicketDto[];
  todaysActivities: {
    created: number;
    updated: number;
    resolved: number;
    rfdMarked: number;
  };
  generatedAt: string;
}
