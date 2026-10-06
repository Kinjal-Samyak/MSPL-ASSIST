import { VehicleRepository } from "../../repositories/vehicle.repository";

describe("VehicleRepository", () => {
  it("should_return_empty_timeline_when_no_deployments", async () => {
    const repository = new VehicleRepository({} as any);
    const result = await repository.findVehicleTimeline([], 1, 10);
    expect(result).toEqual({ items: [], totalRecords: 0 });
  });

  it("should_return_open_ticket_count_zero_when_no_deployments", async () => {
    const repository = new VehicleRepository({} as any);
    const count = await repository.countOpenTickets([]);
    expect(count).toBe(0);
  });

  it("should_query_documents_for_deployments", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[{ id: "doc-1", fileUrl: "https://host/file.pdf", fileType: "application/pdf", uploadedAt: new Date(), ticket: { id: "t-1", ticketNumber: "TK-1" } }], 1]),
      ticketAttachment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;
    const repository = new VehicleRepository(prisma);
    const result = await repository.findVehicleDocuments(["dep-1"], 1, 10);

    expect(result.totalRecords).toBe(1);
  });
});

