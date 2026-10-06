import { SyncPersistenceService } from "../../services/sync-persistence.service";

describe("SyncPersistenceService", () => {
  it("updates one customer when the same phone arrives with a different rider name", async () => {
    const tx = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({
          id: "cust-1",
          name: "Old Rider Name",
          whatsAppNumber: "9876543210",
          status: "ACTIVE",
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: "cust-1" }),
      },
      hub: {
        upsert: jest.fn().mockResolvedValue({ id: "hub-1" }),
      },
      vehicleModel: {
        upsert: jest.fn().mockResolvedValue({ id: "model-1" }),
      },
      deployment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "dep-1" }),
        update: jest.fn(),
      },
    } as any;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (handler: (t: unknown) => Promise<void>) => {
        await handler(tx);
      }),
    } as any;

    const dataSource = {
      listInventoryRecords: jest.fn().mockResolvedValue([]),
      listRiderAssignments: jest.fn().mockResolvedValue([
        {
          riderName: "New Rider Name",
          riderPhone: "9876543210",
          accountStatus: "ACTIVE",
          currentMvTrackNo: "MV-123",
          vehicleNumber: "MTR-123",
          motorNo: "MTR-123",
          model: "Model",
          modelCode: "M-1",
          hub: "Hub A",
          startedAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z",
          deploymentStatus: "ACTIVE",
        },
      ]),
    } as any;

    const service = new SyncPersistenceService(prisma, dataSource);
    const summary = await service.persistJoinedRecords();

    expect(tx.customer.create).not.toHaveBeenCalled();
    expect(tx.customer.update).toHaveBeenCalledTimes(1);
    expect(tx.customer.findFirst).toHaveBeenCalledWith({ where: { registeredMobile: "9876543210" }, select: expect.any(Object) });
    expect(summary.customersUpdated).toBe(1);
  });

  it("persists latest-End-Date closed status to customer and deployment records", async () => {
    const tx = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({
          id: "cust-1",
          name: "Rider",
          whatsAppNumber: "9876543210",
          status: "ACTIVE",
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: "cust-1" }),
      },
      hub: {
        upsert: jest.fn().mockResolvedValue({ id: "hub-1" }),
      },
      vehicleModel: {
        upsert: jest.fn().mockResolvedValue({ id: "model-1" }),
      },
      deployment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "dep-1" }),
        update: jest.fn(),
      },
    } as any;
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (handler: (t: unknown) => Promise<void>) => {
        await handler(tx);
      }),
    } as any;
    const dataSource = {
      listInventoryRecords: jest.fn().mockResolvedValue([]),
      listRiderAssignments: jest.fn().mockResolvedValue([
        {
          riderName: "Rider",
          riderPhone: "9876543210",
          accountStatus: "CLOSED",
          currentMvTrackNo: "MV-LATEST",
          vehicleNumber: "MTR-LATEST",
          motorNo: "MTR-LATEST",
          model: "Model",
          modelCode: "M-1",
          hub: "Hub A",
          startedAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z",
          deploymentStatus: "COMPLETED",
        },
      ]),
    } as any;

    await new SyncPersistenceService(prisma, dataSource).persistJoinedRecords();

    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "INACTIVE" }) })
    );
    expect(tx.deployment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rentalStatus: "COMPLETED" }) })
    );
  });

  it("creates separate customers when the same rider name has different phone numbers", async () => {
    const tx = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: "cust-1" })
          .mockResolvedValueOnce({ id: "cust-2" }),
        update: jest.fn(),
      },
      hub: { upsert: jest.fn().mockResolvedValue({ id: "hub-1" }) },
      vehicleModel: { upsert: jest.fn().mockResolvedValue({ id: "model-1" }) },
      deployment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "dep-1" }),
        update: jest.fn(),
      },
    } as any;
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (handler: (t: unknown) => Promise<void>) => handler(tx)),
    } as any;
    const assignment = {
      riderName: "Same Rider Name",
      accountStatus: "ACTIVE",
      motorNo: "MTR",
      model: "Model",
      modelCode: "M-1",
      hub: "Hub A",
      startedAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
      deploymentStatus: "ACTIVE",
    };
    const dataSource = {
      listInventoryRecords: jest.fn().mockResolvedValue([]),
      listRiderAssignments: jest.fn().mockResolvedValue([
        { ...assignment, riderPhone: "9876543210", currentMvTrackNo: "MV-1", vehicleNumber: "MTR-1" },
        { ...assignment, riderPhone: "9876543211", currentMvTrackNo: "MV-2", vehicleNumber: "MTR-2" },
      ]),
    } as any;

    const summary = await new SyncPersistenceService(prisma, dataSource).persistJoinedRecords();

    expect(tx.customer.create).toHaveBeenCalledTimes(2);
    expect(tx.customer.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ registeredMobile: "9876543210" }) })
    );
    expect(tx.customer.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ registeredMobile: "9876543211" }) })
    );
    expect(summary.customersInserted).toBe(2);
  });
});
