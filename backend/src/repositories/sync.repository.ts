import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  EXCEL_SYNC_EXECUTION_CATEGORY,
  EXCEL_SYNC_EXECUTION_KEY_PREFIX,
  EXCEL_SYNC_STATUS_KEY,
} from "../constants/excel-sync.constants";
import { prismaClient } from "../database";
import type { ExcelSyncEngineResultDto } from "../dto/excel-sync.dto";
import type { PersistedSyncRunDto, SyncRunSummaryDto, SyncStatusDto } from "../dto/sync.dto";

interface PersistedExecutionValue {
  id: string;
  summary: SyncRunSummaryDto;
  rawEngineResult: ExcelSyncEngineResultDto;
  audit?: PersistedSyncRunDto["audit"];
}

interface PersistedStatusValue {
  lastSync: string | null;
  nextSync: string | null;
  durationMs: number | null;
  rowsProcessed: number;
  rowsFailed: number;
  currentStatus: SyncStatusDto["currentStatus"];
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseExecutionValue(value: unknown): PersistedExecutionValue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const typed = value as Partial<PersistedExecutionValue>;
  if (!typed.summary || !typed.rawEngineResult || typeof typed.id !== "string") {
    return null;
  }

  return typed as PersistedExecutionValue;
}

function parseStatusValue(value: unknown): PersistedStatusValue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const typed = value as Partial<PersistedStatusValue>;
  if (
    typeof typed.rowsProcessed !== "number" ||
    typeof typed.rowsFailed !== "number" ||
    typeof typed.currentStatus !== "string"
  ) {
    return null;
  }

  return typed as PersistedStatusValue;
}

function parseEngineResult(value: unknown): ExcelSyncEngineResultDto {
  if (!value || typeof value !== "object") {
    return {
      startedAt: new Date(0).toISOString(),
      finishedAt: new Date(0).toISOString(),
      durationMs: 0,
      results: [],
    };
  }
  const typed = value as Partial<ExcelSyncEngineResultDto>;
  if (
    typeof typed.startedAt !== "string" ||
    typeof typed.finishedAt !== "string" ||
    typeof typed.durationMs !== "number" ||
    !Array.isArray(typed.results)
  ) {
    return {
      startedAt: new Date(0).toISOString(),
      finishedAt: new Date(0).toISOString(),
      durationMs: 0,
      results: [],
    };
  }
  return typed as ExcelSyncEngineResultDto;
}

export class SyncRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async saveExecution(
    summary: SyncRunSummaryDto,
    rawEngineResult: ExcelSyncEngineResultDto,
    audit?: PersistedSyncRunDto["audit"]
  ): Promise<void> {
    const executionId = randomUUID();
    const settingKey = `${EXCEL_SYNC_EXECUTION_KEY_PREFIX}${summary.startTime}:${executionId}`;
    const value: PersistedExecutionValue = {
      id: executionId,
      summary,
      rawEngineResult,
      audit,
    };

    await this.prisma.appSetting.create({
      data: {
        category: EXCEL_SYNC_EXECUTION_CATEGORY,
        settingKey,
        value: toInputJsonValue(value),
        editableByAdmin: false,
      },
    });

    if (this.hasStructuredSyncStore()) {
      await this.saveStructuredExecution(summary, rawEngineResult, audit);
    }
  }

  async saveStatus(status: SyncStatusDto): Promise<void> {
    const value: PersistedStatusValue = {
      lastSync: status.lastSync,
      nextSync: status.nextSync,
      durationMs: status.durationMs,
      rowsProcessed: status.rowsProcessed,
      rowsFailed: status.rowsFailed,
      currentStatus: status.currentStatus,
    };

    const existing = await this.prisma.appSetting.findUnique({
      where: {
        settingKey: EXCEL_SYNC_STATUS_KEY,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      await this.prisma.appSetting.create({
        data: {
          category: EXCEL_SYNC_EXECUTION_CATEGORY,
          settingKey: EXCEL_SYNC_STATUS_KEY,
          value: toInputJsonValue(value),
          editableByAdmin: false,
        },
      });
      return;
    }

    await this.prisma.appSetting.update({
      where: {
        id: existing.id,
      },
      data: {
        value: toInputJsonValue(value),
      },
    });
  }

  async getStatus(): Promise<SyncStatusDto> {
    const status = await this.prisma.appSetting.findUnique({
      where: {
        settingKey: EXCEL_SYNC_STATUS_KEY,
      },
      select: {
        value: true,
      },
    });

    const parsed = parseStatusValue(status?.value);
    if (!parsed) {
      return {
        lastSync: null,
        nextSync: null,
        durationMs: null,
        rowsProcessed: 0,
        rowsFailed: 0,
        currentStatus: "IDLE",
      };
    }

    return {
      lastSync: parsed.lastSync,
      nextSync: parsed.nextSync,
      durationMs: parsed.durationMs,
      rowsProcessed: parsed.rowsProcessed,
      rowsFailed: parsed.rowsFailed,
      currentStatus: parsed.currentStatus,
    };
  }

  async getHistory(limit: number): Promise<PersistedSyncRunDto[]> {
    if (this.hasStructuredSyncStore()) {
      const structuredRows = await this.prisma.syncHistory.findMany({
        orderBy: {
          startedAt: "desc",
        },
        take: limit,
        include: {
          runs: {
            orderBy: {
              orderIndex: "asc",
            },
          },
          auditLogs: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (structuredRows.length > 0) {
        return structuredRows.map((row) => {
          const firstRun = row.runs[0];
          const runDetails = firstRun?.details && typeof firstRun.details === "object" ? firstRun.details : null;
          return {
            id: row.id,
            summary: {
              startTime: row.startedAt.toISOString(),
              endTime: row.completedAt?.toISOString() ?? row.startedAt.toISOString(),
              rowsRead: row.rowsRead,
              rowsInserted: row.rowsInserted,
              rowsUpdated: row.rowsUpdated,
              rowsSkipped: row.rowsIgnored,
              rowsFailed: row.rowsFailed,
              executionTimeMs: row.durationMs ?? 0,
              status: row.status === "PARTIAL" ? "FAILED" : row.status,
              trigger: row.triggeredBy,
            },
            rawEngineResult: parseEngineResult(runDetails),
            audit: {
              syncNumber: row.syncNumber,
              workbookVersion: row.workbookVersion,
              schemaVersion: row.schemaVersion,
              failureReason: row.failureReason,
              exception: row.exception,
              stackTrace: row.stackTrace,
              machine: row.machine ?? "unknown",
              user: row.auditLogs[row.auditLogs.length - 1]?.user ?? "unknown",
              detectedAt: row.updatedAt.toISOString(),
            },
          };
        });
      }
    }

    const rows = await this.prisma.appSetting.findMany({
      where: {
        category: EXCEL_SYNC_EXECUTION_CATEGORY,
        settingKey: {
          startsWith: EXCEL_SYNC_EXECUTION_KEY_PREFIX,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      select: {
        value: true,
      },
    });

    const result: PersistedSyncRunDto[] = [];
    for (const row of rows) {
      const parsed = parseExecutionValue(row.value);
      if (!parsed) {
        continue;
      }

      result.push({
        id: parsed.id,
        summary: parsed.summary,
        rawEngineResult: parsed.rawEngineResult,
        audit: parsed.audit,
      });
    }

    return result;
  }

  private hasStructuredSyncStore(): boolean {
    const prisma = this.prisma as unknown as {
      syncHistory?: { create?: unknown; findMany?: unknown; findFirst?: unknown };
      syncRun?: { create?: unknown };
      syncAuditLog?: { create?: unknown };
    };
    return (
      typeof prisma.syncHistory?.create === "function" &&
      typeof prisma.syncHistory?.findMany === "function" &&
      typeof prisma.syncHistory?.findFirst === "function" &&
      typeof prisma.syncRun?.create === "function" &&
      typeof prisma.syncAuditLog?.create === "function"
    );
  }

  private async saveStructuredExecution(
    summary: SyncRunSummaryDto,
    rawEngineResult: ExcelSyncEngineResultDto,
    audit?: PersistedSyncRunDto["audit"]
  ): Promise<void> {
    const operationalDataset = await this.prisma.operationalDataset.findUnique({
      where: {
        datasetCode: "DEFAULT_OPERATIONAL_DATASET",
      },
      select: {
        id: true,
      },
    });

    const latest = await this.prisma.syncHistory.findFirst({
      orderBy: {
        syncNumber: "desc",
      },
      select: {
        syncNumber: true,
      },
    });
    const nextSyncNumber = (latest?.syncNumber ?? 0) + 1;
    const syncNumber = audit?.syncNumber && audit.syncNumber > nextSyncNumber ? audit.syncNumber : nextSyncNumber;

    const history = await this.prisma.syncHistory.create({
      data: {
        operationalDatasetId: operationalDataset?.id ?? null,
        syncNumber,
        workbookVersion: audit?.workbookVersion ?? null,
        schemaVersion: audit?.schemaVersion ?? null,
        startedAt: new Date(summary.startTime),
        completedAt: new Date(summary.endTime),
        durationMs: summary.executionTimeMs,
        triggeredBy: summary.trigger,
        rowsRead: summary.rowsRead,
        rowsInserted: summary.rowsInserted,
        rowsUpdated: summary.rowsUpdated,
        rowsIgnored: summary.rowsSkipped,
        rowsFailed: summary.rowsFailed,
        status: summary.status,
        failureReason: audit?.failureReason ?? null,
        exception: audit?.exception ?? null,
        stackTrace: audit?.stackTrace ?? null,
        machine: audit?.machine ?? null,
      },
      select: {
        id: true,
      },
    });

    await this.prisma.syncRun.create({
      data: {
        operationalDatasetId: operationalDataset?.id ?? null,
        syncHistoryId: history.id,
        stage: "FULL_SYNC",
        orderIndex: 1,
        status: summary.status,
        startedAt: new Date(summary.startTime),
        completedAt: new Date(summary.endTime),
        durationMs: summary.executionTimeMs,
        rowsRead: summary.rowsRead,
        rowsInserted: summary.rowsInserted,
        rowsUpdated: summary.rowsUpdated,
        rowsIgnored: summary.rowsSkipped,
        rowsFailed: summary.rowsFailed,
        details: toInputJsonValue(rawEngineResult),
      },
    });

    await this.prisma.syncAuditLog.create({
      data: {
        operationalDatasetId: operationalDataset?.id ?? null,
        syncHistoryId: history.id,
        level: summary.status === "SUCCESS" ? "INFO" : "ERROR",
        event: summary.status === "SUCCESS" ? "SYNC_COMPLETED" : "SYNC_FAILED",
        message:
          summary.status === "SUCCESS"
            ? "Synchronization completed successfully."
            : audit?.failureReason ?? "Synchronization failed.",
        payload: toInputJsonValue({
          trigger: summary.trigger,
          rowsRead: summary.rowsRead,
          rowsInserted: summary.rowsInserted,
          rowsUpdated: summary.rowsUpdated,
          rowsSkipped: summary.rowsSkipped,
          rowsFailed: summary.rowsFailed,
          schemaVersion: audit?.schemaVersion ?? null,
        }),
        stackTrace: audit?.stackTrace ?? null,
        machine: audit?.machine ?? null,
        user: audit?.user ?? null,
      },
    });
  }
}
