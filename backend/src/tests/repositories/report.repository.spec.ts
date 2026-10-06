import { ReportRepository } from "../../repositories/report.repository";

describe("ReportRepository", () => {
  it("should_return_ticket_report_data", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[{ id: "ticket-1", ticketNumber: "MV-001" }], 1]),
      ticket: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;
    const repository = new ReportRepository(prisma);
    const result = await repository.getTicketReport({
      page: 1,
      pageSize: 10,
      search: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      hubId: undefined,
      vehicleModelId: undefined,
      vehicle: undefined,
      technicianId: undefined,
      customerId: undefined,
      rider: undefined,
      status: undefined,
      category: undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.totalRecords).toBe(1);
  });
});
