import { DeploymentModuleRepository } from "../../repositories/deployment-module.repository";

describe("DeploymentModuleRepository", () => {
  it("should_list_deployment_metadata", async () => {
    const prisma = {
      deployment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "dep-1",
            customerId: "cust-1",
            mvTrackNumber: "MV-001",
            vehicleNumber: "WB12AB1234",
            rentalStatus: "ACTIVE",
            createdAt: new Date("2026-07-10T00:00:00.000Z"),
            updatedAt: new Date("2026-07-10T01:00:00.000Z"),
            customer: { id: "cust-1", name: "Rider One", registeredMobile: "9876543210" },
            hub: { name: "Kolkata" },
            vehicleModel: { modelCode: "M-1", displayName: "Model One" },
          },
        ]),
      },
    } as any;

    const repository = new DeploymentModuleRepository(prisma);
    const result = await repository.listDeploymentMetadata();
    expect(result[0]).toMatchObject({
      deploymentId: "dep-1",
      customerName: "Rider One",
      modelCode: "M-1",
    });
  });

  it("should_return_null_when_deployment_not_found_by_id", async () => {
    const prisma = {
      deployment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const repository = new DeploymentModuleRepository(prisma);
    const result = await repository.findDeploymentMetadataById("dep-404");
    expect(result).toBeNull();
  });

  it("should_query_timeline", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([
        [{ id: "evt-1", activityType: "STATUS_UPDATED", description: "Updated", performedAt: new Date(), ticketId: "t-1" }],
        1,
      ]),
      ticketActivity: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;
    const repository = new DeploymentModuleRepository(prisma);
    const result = await repository.findTimeline("dep-1", 1, 10);
    expect(result.totalRecords).toBe(1);
  });
});
