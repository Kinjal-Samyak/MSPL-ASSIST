import type { ExcelSyncEngineResultDto } from "../dto/excel-sync.dto";
import type { PersistedSyncRunDto, SyncRunStatus, SyncRunSummaryDto, SyncStatusDto } from "../dto/sync.dto";
import { ConflictError } from "../errors";
import { ExcelSynchronizationEngine } from "../excel/excel-sync.engine";
import { ExcelSyncLogger } from "../excel/excel-sync.logger";
import fs from "node:fs";
import os from "node:os";
import {
  OperationalDataService,
  operationalDataService,
  type SyncRuntimeConfiguration,
} from "./operational-data.service";
import { SyncRepository } from "../repositories/sync.repository";
import { syncPersistenceService, type SyncPersistenceSummary } from "./sync-persistence.service";

export interface SyncRunOptions {
  trigger: "MANUAL" | "SCHEDULER";
  nextSync: string | null;
}

export class SyncService {
  private running = false;
  private syncCounter = 0;
  private lastPersistenceSummary: SyncPersistenceSummary | null = null;

  constructor(
    private readonly engine: ExcelSynchronizationEngine = new ExcelSynchronizationEngine(),
    private readonly repository: SyncRepository = new SyncRepository(),
    private readonly syncLogger: ExcelSyncLogger = new ExcelSyncLogger(),
    private readonly settingsService: OperationalDataService = operationalDataService,
    private readonly persistenceService: { persistJoinedRecords: () => Promise<SyncPersistenceSummary> } =
      syncPersistenceService
  ) {}

  async runSync(options: SyncRunOptions): Promise<SyncRunSummaryDto> {
    if (this.running) {
      throw new ConflictError("Synchronization is already running.");
    }

    this.running = true;
    const startTime = new Date().toISOString();
    await this.repository.saveStatus({
      lastSync: startTime,
      nextSync: options.nextSync,
      durationMs: null,
      rowsProcessed: 0,
      rowsFailed: 0,
      currentStatus: "RUNNING",
    });
    this.syncLogger.info({
      scope: "excel-sync",
      event: "Sync Started",
      trigger: options.trigger,
      startTime,
    });

    let runtime: SyncRuntimeConfiguration | null = null;
    try {
      this.lastPersistenceSummary = null;
      runtime = await this.settingsService.getSyncRuntimeConfiguration();
      const engineResult = await this.engine.run(runtime.config);
      this.lastPersistenceSummary = await this.persistenceService.persistJoinedRecords();
      const summary = this.toSummary(engineResult, options.trigger, "SUCCESS");
      this.syncCounter += 1;
      await this.repository.saveExecution(summary, engineResult, {
        syncNumber: this.syncCounter,
        workbookVersion: runtime.metadata.masterDeploymentLastModified
          ? `${runtime.metadata.masterDeploymentLastModified}|${runtime.metadata.inventoryLastModified}`
          : null,
        schemaVersion: runtime.metadata.worksheetHash,
        failureReason: null,
        exception: null,
        stackTrace: null,
        machine: os.hostname(),
        user: os.userInfo().username,
        detectedAt: summary.endTime,
      });
      await this.settingsService.recordSyncStatus({
        lastSyncTime: summary.endTime,
        status: "SUCCESS",
        durationMs: summary.executionTimeMs,
        rowsImported: summary.rowsInserted,
        rowsUpdated: summary.rowsUpdated,
        rowsFailed: summary.rowsFailed,
        masterDeploymentLastModified: runtime.metadata.masterDeploymentLastModified,
        inventoryLastModified: runtime.metadata.inventoryLastModified,
        workbookHash: `${runtime.metadata.masterWorkbookHash}|${runtime.metadata.inventoryWorkbookHash}`,
        worksheetHash: runtime.metadata.worksheetHash,
      });
      await this.repository.saveStatus({
        lastSync: summary.endTime,
        nextSync: options.nextSync,
        durationMs: summary.executionTimeMs,
        rowsProcessed: summary.rowsRead,
        rowsFailed: summary.rowsFailed,
        currentStatus: "IDLE",
      });
      this.syncLogger.info({
        scope: "excel-sync",
        event: "Sync Completed",
        trigger: options.trigger,
        summary,
        persistence: this.lastPersistenceSummary,
      });
      return summary;
    } catch (error) {
      const endTime = new Date().toISOString();
      const failedSummary: SyncRunSummaryDto = {
        startTime,
        endTime,
        rowsRead: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsFailed: 1,
        executionTimeMs: new Date(endTime).getTime() - new Date(startTime).getTime(),
        status: "FAILED",
        trigger: options.trigger,
      };
      await this.repository.saveStatus({
        lastSync: endTime,
        nextSync: options.nextSync,
        durationMs: failedSummary.executionTimeMs,
        rowsProcessed: 0,
        rowsFailed: 1,
        currentStatus: "IDLE",
      });
      this.syncLogger.error({
        scope: "excel-sync",
        event: "Sync Failed",
        trigger: options.trigger,
        error: error instanceof Error ? error.message : "Unknown synchronization error.",
      });
      await this.settingsService.recordSyncStatus({
        lastSyncTime: endTime,
        status: "FAILED",
        durationMs: failedSummary.executionTimeMs,
        rowsImported: 0,
        rowsUpdated: 0,
        rowsFailed: 1,
        masterDeploymentLastModified: runtime?.metadata.masterDeploymentLastModified ?? null,
        inventoryLastModified: runtime?.metadata.inventoryLastModified ?? null,
        workbookHash:
          runtime == null
            ? null
            : `${runtime.metadata.masterWorkbookHash}|${runtime.metadata.inventoryWorkbookHash}`,
        worksheetHash: runtime?.metadata.worksheetHash ?? null,
      });
      this.syncCounter += 1;
      await this.repository.saveExecution(
        failedSummary,
        {
          startedAt: startTime,
          finishedAt: endTime,
          durationMs: failedSummary.executionTimeMs,
          results: [],
        },
        {
          syncNumber: this.syncCounter,
          workbookVersion:
            runtime?.metadata.masterDeploymentLastModified && runtime?.metadata.inventoryLastModified
              ? `${runtime.metadata.masterDeploymentLastModified}|${runtime.metadata.inventoryLastModified}`
              : null,
          schemaVersion: runtime?.metadata.worksheetHash ?? null,
          failureReason: error instanceof Error ? error.message : "Unknown synchronization error.",
          exception: error instanceof Error ? error.name : "UnknownError",
          stackTrace: error instanceof Error ? error.stack ?? null : null,
          machine: os.hostname(),
          user: os.userInfo().username,
          detectedAt: endTime,
        }
      );
      throw error;
    } finally {
      if (runtime?.cleanupFilePaths) {
        for (const cleanupPath of runtime.cleanupFilePaths) {
          if (fs.existsSync(cleanupPath)) {
            fs.unlinkSync(cleanupPath);
          }
        }
      }
      this.running = false;
    }
  }

  async getStatus(nextSync: string | null): Promise<SyncStatusDto> {
    const status = await this.repository.getStatus();
    const settings = await this.settingsService.getSettings();
    return {
      ...status,
      nextSync: status.currentStatus === "RUNNING" ? nextSync : status.nextSync ?? nextSync,
      operationalDataFolder: settings.operationalDataFolder,
      masterWorkbook: settings.masterWorkbook,
      masterWorksheet: settings.masterWorksheet,
      inventoryWorkbook: settings.inventoryWorkbook,
      inventoryWorksheet: settings.inventoryWorksheet,
      schedulerMode: settings.syncFrequency,
    };
  }

  async getHistory(limit: number): Promise<PersistedSyncRunDto[]> {
    return this.repository.getHistory(limit);
  }

  private toSummary(
    result: ExcelSyncEngineResultDto,
    trigger: "MANUAL" | "SCHEDULER",
    status: SyncRunStatus
  ): SyncRunSummaryDto {
    const aggregated = result.results.reduce(
      (acc, item) => {
        acc.rowsRead += item.summary.rowsRead;
        acc.rowsInserted += item.summary.rowsInserted;
        acc.rowsUpdated += item.summary.rowsUpdated;
        acc.rowsSkipped += item.summary.rowsSkipped;
        acc.rowsFailed += item.summary.rowsFailed;
        return acc;
      },
      {
        rowsRead: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsFailed: 0,
      }
    );

    return {
      startTime: result.startedAt,
      endTime: result.finishedAt,
      rowsRead: aggregated.rowsRead,
      rowsInserted: aggregated.rowsInserted,
      rowsUpdated: aggregated.rowsUpdated,
      rowsSkipped: aggregated.rowsSkipped,
      rowsFailed: aggregated.rowsFailed,
      executionTimeMs: result.durationMs,
      status,
      trigger,
      operationalMetrics: this.lastPersistenceSummary?.operationalMetrics,
    };
  }
}

export const syncService = new SyncService();
