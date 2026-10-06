import { SyncRepository } from "../../repositories/sync.repository";

describe("SyncRepository", () => {
  it("should_save_status_using_existing_record", async () => {
    const prisma = {
      appSetting: {
        findUnique: jest.fn().mockResolvedValue({ id: "status-1" }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn(),
      },
    } as any;

    const repository = new SyncRepository(prisma);
    await repository.saveStatus({
      lastSync: "2026-07-13T00:00:00.000Z",
      nextSync: null,
      durationMs: 1000,
      rowsProcessed: 10,
      rowsFailed: 1,
      currentStatus: "IDLE",
    });

    expect(prisma.appSetting.update).toHaveBeenCalledTimes(1);
  });

  it("should_return_default_status_when_missing", async () => {
    const prisma = {
      appSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const repository = new SyncRepository(prisma);
    const status = await repository.getStatus();
    expect(status).toEqual({
      lastSync: null,
      nextSync: null,
      durationMs: null,
      rowsProcessed: 0,
      rowsFailed: 0,
      currentStatus: "IDLE",
    });
  });
});
