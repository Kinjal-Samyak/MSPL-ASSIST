import { WorkshopRepository } from "../../repositories/workshop.repository";

describe("WorkshopRepository", () => {
  it("should_return_job_record_by_id", async () => {
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue({
          id: "job-1",
          ticketNumber: "MV-010126-001",
          status: { name: "Open" },
          priority: "MEDIUM",
          customer: { id: "cust-1", name: "Rider One", registeredMobile: "9876543210" },
          deployment: {
            id: "dep-1",
            mvTrackNumber: "MV-001",
            vehicleNumber: "WB12AB1234",
            hub: { name: "Kolkata" },
          },
          assignedTo: null,
          issueCategory: { name: "Battery" },
          issueDescription: "Issue",
          createdAt: new Date(),
          updatedAt: new Date(),
          eta: null,
          coordinatorNotes: null,
          estimatedCharges: null,
          finalCharges: null,
        }),
      },
    } as any;

    const repository = new WorkshopRepository(prisma);
    const result = await repository.findJobById("job-1");
    expect(result?.id).toBe("job-1");
    expect(result?.customerName).toBe("Rider One");
  });

  it("should_return_timeline", async () => {
    const prisma = {
      $transaction: jest
        .fn()
        .mockResolvedValue([
          [{ id: "evt-1", activityType: "JOB_CREATED", description: "created", performedAt: new Date(), ticketId: "job-1" }],
          1,
        ]),
      ticketActivity: { findMany: jest.fn(), count: jest.fn() },
    } as any;
    const repository = new WorkshopRepository(prisma);
    const result = await repository.getTimeline("job-1", 1, 10);
    expect(result.totalRecords).toBe(1);
  });

});
