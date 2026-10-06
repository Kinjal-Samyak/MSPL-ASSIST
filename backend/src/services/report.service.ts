import { prismaClient } from "../database";
import { REPORT_TITLES } from "../constants/report-access";
import type {
  AdminReportDto,
  CustomerReportDto,
  DeploymentReportDto,
  ExecutiveDashboardDto,
  NotificationReportDto,
  ReportDashboardDto,
  ReportListResponseDto,
  TicketReportDto,
  VehicleReportDto,
  WorkshopReportDto,
} from "../dto/report.dto";
import { ReportRepository } from "../repositories/report.repository";
import { validateExportFormat, validateReportQuery } from "../validators/report.validator";
import { ReportMapper } from "./report.mapper";
import { ReportExportService, type ExportFile } from "./report-export.service";

export class ReportService {
  private readonly repository: ReportRepository;
  private readonly exportService: ReportExportService;

  constructor(repository?: ReportRepository, exportService?: ReportExportService) {
    this.repository = repository ?? new ReportRepository(prismaClient);
    this.exportService = exportService ?? new ReportExportService();
  }

  async getExecutiveDashboard(queryInput: unknown): Promise<ExecutiveDashboardDto> {
    const query = validateReportQuery(queryInput);
    const [kpiSummary, trendRows, statusRows, categoryRows, notificationRows] = await Promise.all([
      this.repository.getKpiSummary(),
      this.repository.getTicketTrend(),
      this.repository.getTicketsByStatus(query),
      this.repository.getTicketsByCategory(query),
      this.repository.getNotificationsByChannel(query),
    ]);

    const utilization =
      kpiSummary.totalDeployments === 0
        ? 0
        : Number(((kpiSummary.activeDeployments / kpiSummary.totalDeployments) * 100).toFixed(2));

    const monthlyMap = new Map<string, number>();
    for (const row of trendRows) {
      const label = `${row.createdAt.getUTCFullYear()}-${String(row.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(label, (monthlyMap.get(label) ?? 0) + 1);
    }

    const statusNames = await this.repository.getStatusNames(statusRows.map((row) => row.statusId));
    const statusNameMap = new Map(statusNames.map((row) => [row.id, row.name]));

    const categoryNames = await this.repository.getCategoryNames(categoryRows.map((row) => row.issueCategoryId));
    const categoryNameMap = new Map(categoryNames.map((row) => [row.id, row.name]));

    return ReportMapper.toExecutiveDashboard({
      kpi: {
        fleetUtilization: utilization,
        revenue: kpiSummary.revenue,
        processingFees: kpiSummary.processingFees,
        securityDeposits: kpiSummary.securityDeposits,
        openTickets: kpiSummary.openTickets,
        workshopJobs: kpiSummary.workshopJobs,
        deployments: kpiSummary.totalDeployments,
        customerCount: kpiSummary.customerCount,
        notificationFailures: kpiSummary.notificationFailures,
      },
      ticketTrend: Array.from(monthlyMap.entries()).map(([label, value]) => ({ label, value })),
      ticketsByStatus: statusRows.map((row) => ({
        label: statusNameMap.get(row.statusId) ?? row.statusId,
        value: row._count._all,
      })),
      ticketsByCategory: categoryRows.map((row) => ({
        label: categoryNameMap.get(row.issueCategoryId) ?? row.issueCategoryId,
        value: row._count._all,
      })),
      notificationsByChannel: notificationRows.map((row) => ({
        label: row.channel,
        value: row._count._all,
      })),
    });
  }

  async getDashboard(): Promise<ReportDashboardDto> {
    const counts = await this.repository.getDashboardCounts();
    return {
      generatedAt: new Date().toISOString(),
      reports: [
        { reportKey: "tickets", title: "Ticket Reports", totalRecords: counts.tickets },
        { reportKey: "customers", title: "Customer Reports", totalRecords: counts.customers },
        { reportKey: "vehicles", title: "Vehicle Reports", totalRecords: counts.vehicles },
        { reportKey: "deployments", title: "Deployment Reports", totalRecords: counts.deployments },
        { reportKey: "workshop", title: "Workshop Reports", totalRecords: counts.workshop },
        { reportKey: "notifications", title: "Notification Reports", totalRecords: counts.notifications },
        { reportKey: "admin", title: "Admin Reports", totalRecords: counts.admin },
      ],
      supportedExports: ["EXCEL", "CSV", "PDF"],
    };
  }

  async getTicketReports(queryInput: unknown): Promise<ReportListResponseDto<TicketReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getTicketReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toTicketReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async getCustomerReports(queryInput: unknown): Promise<ReportListResponseDto<CustomerReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getCustomerReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toCustomerReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async getVehicleReports(queryInput: unknown): Promise<ReportListResponseDto<VehicleReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getVehicleReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toVehicleReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async getDeploymentReports(queryInput: unknown): Promise<ReportListResponseDto<DeploymentReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getDeploymentReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toDeploymentReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async getWorkshopReports(queryInput: unknown): Promise<ReportListResponseDto<WorkshopReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getWorkshopReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toWorkshopReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async getNotificationReports(queryInput: unknown): Promise<ReportListResponseDto<NotificationReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getNotificationReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toNotificationReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async getAdminReports(queryInput: unknown): Promise<ReportListResponseDto<AdminReportDto>> {
    const query = validateReportQuery(queryInput);
    const { items, totalRecords } = await this.repository.getAdminReport(query);
    return ReportMapper.toListResponse(
      items.map((item) => ReportMapper.toAdminReport(item)),
      totalRecords,
      query.page,
      query.pageSize
    );
  }

  async exportReport(
    reportKey: string,
    formatInput: unknown,
    queryInput: unknown,
    generatedBy: string
  ): Promise<ExportFile> {
    const format = validateExportFormat(formatInput);
    const normalizedKey = reportKey.toLowerCase();

    const rows = await this.getReportForExport(normalizedKey, queryInput);
    const query = queryInput as Record<string, unknown>;
    const exportInput = {
      reportTitle: REPORT_TITLES[normalizedKey] ?? normalizedKey,
      generatedBy,
      generatedAt: new Date().toISOString(),
      filters: {
        search: this.asString(query.search),
        dateFrom: this.asString(query.dateFrom),
        dateTo: this.asString(query.dateTo),
        hubId: this.asString(query.hubId),
        status: this.asString(query.status),
        category: this.asString(query.category),
      },
      rows,
    };

    if (format === "PDF") return this.exportService.buildPdf(exportInput);
    if (format === "EXCEL") return this.exportService.buildExcel(exportInput);
    return this.exportService.buildCsv(exportInput);
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  }

  private async getReportForExport(reportKey: string, queryInput: unknown): Promise<Record<string, unknown>[]> {
    switch (reportKey) {
      case "tickets":
        return (await this.getTicketReports(queryInput)).items as unknown as Record<string, unknown>[];
      case "customers":
        return (await this.getCustomerReports(queryInput)).items as unknown as Record<string, unknown>[];
      case "vehicles":
        return (await this.getVehicleReports(queryInput)).items as unknown as Record<string, unknown>[];
      case "deployments":
        return (await this.getDeploymentReports(queryInput)).items as unknown as Record<string, unknown>[];
      case "workshop":
        return (await this.getWorkshopReports(queryInput)).items as unknown as Record<string, unknown>[];
      case "notifications":
        return (await this.getNotificationReports(queryInput)).items as unknown as Record<string, unknown>[];
      case "admin":
        return (await this.getAdminReports(queryInput)).items as unknown as Record<string, unknown>[];
      default:
        return [];
    }
  }
}
