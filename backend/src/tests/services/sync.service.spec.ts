import { ConflictError } from "../../errors";
import { SyncService } from "../../services/sync.service";

describe("SyncService", () => {
  it("should_aggregate_engine_results_into_summary", async () => {
    const engine = {
      run: jest.fn().mockResolvedValue({
        startedAt: "2026-07-13T10:00:00.000Z",
        finishedAt: "2026-07-13T10:00:05.000Z",
        durationMs: 5000,
        results: [
          {
            source: "MASTER_DEPLOYMENT",
            summary: {
              rowsRead: 10,
              rowsInserted: 4,
              rowsUpdated: 2,
              rowsSkipped: 3,
              rowsFailed: 1,
              executionTimeMs: 2000,
            },
            errors: [],
          },
          {
            source: "INVENTORY_NSPL",
            summary: {
              rowsRead: 20,
              rowsInserted: 6,
              rowsUpdated: 5,
              rowsSkipped: 7,
              rowsFailed: 2,
              executionTimeMs: 3000,
            },
            errors: [],
          },
        ],
      }),
    } as any;

    const repository = {
      saveStatus: jest.fn().mockResolvedValue(undefined),
      saveExecution: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn(),
      getHistory: jest.fn(),
    } as any;
    const settingsService = {
      getSyncRuntimeConfiguration: jest.fn().mockResolvedValue({
        config: {
          scheduler: { enabled: false, mode: "MANUAL", historyLimit: 50 },
          masterDeployment: { filePath: "master.xlsx", sheetName: "Master Deployment", activeStatuses: ["ACTIVE"] },
          inventoryNspl: { filePath: "inventory.xlsx", sheetName: "Inventory_NSPL" },
        },
        metadata: {
          masterDeploymentLastModified: "2026-07-13T10:00:00.000Z",
          inventoryLastModified: "2026-07-13T10:00:00.000Z",
        },
      }),
      recordSyncStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
    const persistenceService = {
      persistJoinedRecords: jest.fn().mockResolvedValue({
        customersInserted: 0,
        customersUpdated: 0,
        deploymentsInserted: 0,
        deploymentsUpdated: 0,
        skippedReasons: {},
      }),
    } as any;

    const service = new SyncService(
      engine,
      repository,
      { info: jest.fn(), error: jest.fn() } as any,
      settingsService,
      persistenceService
    );
    const summary = await service.runSync({
      trigger: "MANUAL",
      nextSync: null,
    });

    expect(summary.rowsRead).toBe(30);
    expect(summary.rowsInserted).toBe(10);
    expect(summary.rowsUpdated).toBe(7);
    expect(summary.rowsSkipped).toBe(10);
    expect(summary.rowsFailed).toBe(3);
    expect(summary.status).toBe("SUCCESS");
  });

  it("should_reject_parallel_runs", async () => {
    let resolveRun: () => void = () => undefined;
    const runPromise = new Promise<void>((resolve) => {
      resolveRun = resolve;
    });
    const engine = {
      run: jest.fn().mockImplementation(async () => {
        await runPromise;
        return {
          startedAt: "2026-07-13T10:00:00.000Z",
          finishedAt: "2026-07-13T10:00:05.000Z",
          durationMs: 5000,
          results: [],
        };
      }),
    } as any;
    const repository = {
      saveStatus: jest.fn().mockResolvedValue(undefined),
      saveExecution: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn(),
      getHistory: jest.fn(),
    } as any;
    const settingsService = {
      getSyncRuntimeConfiguration: jest.fn().mockResolvedValue({
        config: {
          scheduler: { enabled: false, mode: "MANUAL", historyLimit: 50 },
          masterDeployment: { filePath: "master.xlsx", sheetName: "Master Deployment", activeStatuses: ["ACTIVE"] },
          inventoryNspl: { filePath: "inventory.xlsx", sheetName: "Inventory_NSPL" },
        },
        metadata: {
          masterDeploymentLastModified: "2026-07-13T10:00:00.000Z",
          inventoryLastModified: "2026-07-13T10:00:00.000Z",
        },
      }),
      recordSyncStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
    const persistenceService = {
      persistJoinedRecords: jest.fn().mockResolvedValue({
        customersInserted: 0,
        customersUpdated: 0,
        deploymentsInserted: 0,
        deploymentsUpdated: 0,
        skippedReasons: {},
      }),
    } as any;

    const service = new SyncService(
      engine,
      repository,
      { info: jest.fn(), error: jest.fn() } as any,
      settingsService,
      persistenceService
    );
    const firstRun = service.runSync({ trigger: "MANUAL", nextSync: null });
    await expect(service.runSync({ trigger: "MANUAL", nextSync: null })).rejects.toBeInstanceOf(ConflictError);
    resolveRun();
    await firstRun;
  });
});
