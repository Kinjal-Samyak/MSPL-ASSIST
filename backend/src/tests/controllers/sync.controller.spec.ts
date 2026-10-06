import { SyncController } from "../../controllers/sync.controller";

describe("SyncController", () => {
  it("should_return_manual_sync_response", async () => {
    const service = {
      runSync: jest.fn().mockResolvedValue({
        startTime: "2026-07-13T00:00:00.000Z",
        endTime: "2026-07-13T00:00:10.000Z",
        rowsRead: 10,
        rowsInserted: 4,
        rowsUpdated: 2,
        rowsSkipped: 3,
        rowsFailed: 1,
        executionTimeMs: 10000,
        status: "SUCCESS",
        trigger: "MANUAL",
      }),
      getStatus: jest.fn(),
      getHistory: jest.fn(),
    } as any;
    const controller = new SyncController(service, () => ({
      getNextRunAt: () => null,
      schedule: () => undefined,
      stop: () => undefined,
    }));

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    await controller.runSync({} as any, { status, json } as any, jest.fn());

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});
