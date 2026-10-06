import { ReportService } from "../../services/report.service";

describe("ReportService", () => {
  it("should_return_report_dashboard", async () => {
    const repository = {
      getDashboardCounts: jest.fn().mockResolvedValue({
        tickets: 10,
        customers: 8,
        vehicles: 12,
        deployments: 9,
        workshop: 4,
        notifications: 20,
        admin: 3,
      }),
    } as any;
    const service = new ReportService(repository);
    const result = await service.getDashboard();

    expect(result.reports).toHaveLength(7);
    expect(result.supportedExports).toEqual(["EXCEL", "CSV", "PDF"]);
  });

  it("should_return_executive_dashboard", async () => {
    const repository = {
      getKpiSummary: jest.fn().mockResolvedValue({
        totalDeployments: 10,
        activeDeployments: 8,
        customerCount: 20,
        openTickets: 5,
        workshopJobs: 3,
        notificationFailures: 2,
        revenue: 1000,
        processingFees: 100,
        securityDeposits: 0,
      }),
      getTicketTrend: jest.fn().mockResolvedValue([{ createdAt: new Date("2026-07-01T00:00:00.000Z") }]),
      getTicketsByStatus: jest.fn().mockResolvedValue([{ statusId: "status-1", _count: { _all: 5 } }]),
      getTicketsByCategory: jest.fn().mockResolvedValue([{ issueCategoryId: "cat-1", _count: { _all: 4 } }]),
      getNotificationsByChannel: jest.fn().mockResolvedValue([{ channel: "EMAIL", _count: { _all: 3 } }]),
      getStatusNames: jest.fn().mockResolvedValue([{ id: "status-1", name: "Open" }]),
      getCategoryNames: jest.fn().mockResolvedValue([{ id: "cat-1", name: "Battery" }]),
    } as any;
    const service = new ReportService(repository);
    const result = await service.getExecutiveDashboard({});

    expect(result.kpi.fleetUtilization).toBe(80);
    expect(result.ticketsByStatus[0].label).toBe("Open");
  });
});
