import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  EXCEL_SYNC_INVENTORY_NSPL_CATEGORY,
  EXCEL_SYNC_MASTER_DEPLOYMENT_CATEGORY,
} from "../constants/excel-sync.constants";
import type {
  InventoryNsplSyncRowDto,
  MasterDeploymentSyncRowDto,
  SyncPersistenceAction,
} from "../dto/excel-sync.dto";
import { prismaClient } from "../database";
import type { SyncRepository } from "../interfaces/excel-sync.interface";

interface SnapshotValue {
  rowKey: string;
  checksum: string;
  payload: Record<string, unknown>;
}

function normalizedMotorNo(value: string | null): string {
  return (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseSnapshotValue(value: unknown): SnapshotValue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const typedValue = value as Partial<SnapshotValue>;
  if (
    typeof typedValue.rowKey !== "string" ||
    typeof typedValue.checksum !== "string" ||
    typedValue.payload === undefined
  ) {
    return null;
  }

  return typedValue as SnapshotValue;
}

export class ExcelSyncRepository implements SyncRepository {
  private operationalDatasetId: string | null = null;

  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async upsertMasterDeploymentRow(row: MasterDeploymentSyncRowDto): Promise<SyncPersistenceAction> {
    const rowKey = this.toMasterRowKey(row);
    return this.upsertSnapshot(
      EXCEL_SYNC_MASTER_DEPLOYMENT_CATEGORY,
      "master-deployment",
      rowKey,
      { ...row }
    );
  }

  async upsertInventoryNsplRow(row: InventoryNsplSyncRowDto): Promise<SyncPersistenceAction> {
    const rowKey = this.toInventoryRowKey(row);
    return this.upsertSnapshot(EXCEL_SYNC_INVENTORY_NSPL_CATEGORY, "inventory-nspl", rowKey, { ...row });
  }

  async pruneMasterDeploymentRows(rowKeys: string[]): Promise<number> {
    return this.pruneSnapshots(EXCEL_SYNC_MASTER_DEPLOYMENT_CATEGORY, "master-deployment", rowKeys);
  }

  /**
   * An inventory import is a complete reference dataset.  Remove snapshots that
   * are not part of the completed import so an earlier MV Track No. cannot keep
   * a second copy of the same physical MotorNo. visible to the application.
   */
  async pruneInventoryNsplRows(rowKeys: string[]): Promise<number> {
    const expectedKeys = new Set(rowKeys.map((rowKey) => `inventory-nspl:${sha256(rowKey)}`));
    const snapshots = await this.prisma.appSetting.findMany({
      where: { category: EXCEL_SYNC_INVENTORY_NSPL_CATEGORY },
      select: { id: true, settingKey: true },
    });
    const staleIds = snapshots
      .filter((snapshot) => !expectedKeys.has(snapshot.settingKey))
      .map((snapshot) => snapshot.id);

    if (staleIds.length > 0) {
      await this.prisma.appSetting.deleteMany({ where: { id: { in: staleIds } } });
    }

    const operationalDatasetId = await this.ensureOperationalDatasetId();
    const prismaWithDatasetSnapshot = this.prisma as unknown as {
      datasetSnapshot?: {
        findMany?: (args: unknown) => Promise<Array<{ id: string; snapshotKey: string }>>;
        deleteMany?: (args: unknown) => Promise<unknown>;
      };
    };
    if (operationalDatasetId && typeof prismaWithDatasetSnapshot.datasetSnapshot?.findMany === "function") {
      const datasetSnapshots = await prismaWithDatasetSnapshot.datasetSnapshot.findMany({
        where: { operationalDatasetId, snapshotKey: { startsWith: "inventory-nspl:" } },
        select: { id: true, snapshotKey: true },
      });
      const staleDatasetIds = datasetSnapshots
        .filter((snapshot) => !expectedKeys.has(snapshot.snapshotKey))
        .map((snapshot) => snapshot.id);
      if (staleDatasetIds.length > 0 && typeof prismaWithDatasetSnapshot.datasetSnapshot.deleteMany === "function") {
        await prismaWithDatasetSnapshot.datasetSnapshot.deleteMany({ where: { id: { in: staleDatasetIds } } });
      }
    }

    return staleIds.length;
  }

  private async pruneSnapshots(category: string, prefix: string, rowKeys: string[]): Promise<number> {
    const expectedKeys = new Set(rowKeys.map((rowKey) => `${prefix}:${sha256(rowKey)}`));
    const snapshots = await this.prisma.appSetting.findMany({
      where: { category },
      select: { id: true, settingKey: true },
    });
    const staleIds = snapshots.filter((row) => !expectedKeys.has(row.settingKey)).map((row) => row.id);
    if (staleIds.length > 0) {
      await this.prisma.appSetting.deleteMany({ where: { id: { in: staleIds } } });
    }

    const operationalDatasetId = await this.ensureOperationalDatasetId();
    const datasetSnapshot = (this.prisma as unknown as {
      datasetSnapshot?: {
        findMany?: (args: unknown) => Promise<Array<{ id: string; snapshotKey: string }>>;
        deleteMany?: (args: unknown) => Promise<{ count: number }>;
      };
    }).datasetSnapshot;
    if (!operationalDatasetId || !datasetSnapshot?.findMany || !datasetSnapshot.deleteMany) {
      return staleIds.length;
    }
    const structured = await datasetSnapshot.findMany({
      where: { operationalDatasetId, snapshotKey: { startsWith: `${prefix}:` } },
      select: { id: true, snapshotKey: true },
    });
    const staleStructuredIds = structured
      .filter((row) => !expectedKeys.has(row.snapshotKey))
      .map((row) => row.id);
    if (staleStructuredIds.length > 0) {
      await datasetSnapshot.deleteMany({ where: { id: { in: staleStructuredIds } } });
    }
    return Math.max(staleIds.length, staleStructuredIds.length);
  }

  private async upsertSnapshot(
    category: string,
    keyPrefix: string,
    rowKey: string,
    payload: Record<string, unknown>
  ): Promise<SyncPersistenceAction> {
    const settingKey = `${keyPrefix}:${sha256(rowKey)}`;
    const checksum = sha256(JSON.stringify(payload));
    const nextValueJson: Prisma.InputJsonObject = {
      rowKey,
      checksum,
      payload: toInputJsonValue(payload),
    };

    const existing = await this.prisma.appSetting.findUnique({
      where: {
        settingKey,
      },
      select: {
        id: true,
        value: true,
      },
    });

    if (!existing) {
      await this.prisma.appSetting.create({
        data: {
          category,
          settingKey,
          value: nextValueJson,
          editableByAdmin: false,
        },
      });
      await this.upsertDatasetSnapshot(settingKey, checksum, payload);
      return "inserted";
    }

    const parsed = parseSnapshotValue(existing.value);
    if (parsed?.checksum === checksum) {
      await this.upsertDatasetSnapshot(settingKey, checksum, payload);
      return "unchanged";
    }

    await this.prisma.appSetting.update({
      where: {
        id: existing.id,
      },
      data: {
        value: nextValueJson,
      },
    });
    await this.upsertDatasetSnapshot(settingKey, checksum, payload);

    return "updated";
  }

  private async ensureOperationalDatasetId(): Promise<string | null> {
    if (this.operationalDatasetId) {
      return this.operationalDatasetId;
    }

    const prismaWithOperationalDataset = this.prisma as unknown as {
      operationalDataset?: {
        upsert?: (args: unknown) => Promise<{ id: string }>;
      };
    };

    if (typeof prismaWithOperationalDataset.operationalDataset?.upsert !== "function") {
      return null;
    }

    const dataset = await prismaWithOperationalDataset.operationalDataset.upsert({
      where: {
        datasetCode: "DEFAULT_OPERATIONAL_DATASET",
      },
      update: {
        active: true,
      },
      create: {
        datasetCode: "DEFAULT_OPERATIONAL_DATASET",
        name: "Default Operational Dataset",
        description: "Primary operational dataset for synchronized master and inventory workbooks.",
        active: true,
      },
      select: {
        id: true,
      },
    });
    this.operationalDatasetId = dataset.id;
    return dataset.id;
  }

  private async upsertDatasetSnapshot(
    snapshotKey: string,
    snapshotChecksum: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const operationalDatasetId = await this.ensureOperationalDatasetId();
    if (!operationalDatasetId) {
      return;
    }

    const prismaWithDatasetSnapshot = this.prisma as unknown as {
      datasetSnapshot?: {
        upsert?: (args: unknown) => Promise<unknown>;
      };
    };
    if (typeof prismaWithDatasetSnapshot.datasetSnapshot?.upsert !== "function") {
      return;
    }
    await prismaWithDatasetSnapshot.datasetSnapshot.upsert({
      where: {
        operationalDatasetId_snapshotKey: {
          operationalDatasetId,
          snapshotKey,
        },
      },
      update: {
        snapshotChecksum,
        payload: toInputJsonValue({
          rowKey: snapshotKey,
          checksum: snapshotChecksum,
          payload,
        }),
      },
      create: {
        operationalDatasetId,
        snapshotKey,
        snapshotChecksum,
        payload: toInputJsonValue({
          rowKey: snapshotKey,
          checksum: snapshotChecksum,
          payload,
        }),
      },
    });
  }

  private toMasterRowKey(row: MasterDeploymentSyncRowDto): string {
    return String(row.rowNumber);
  }

  private toInventoryRowKey(row: InventoryNsplSyncRowDto): string {
    // MotorNo is the immutable physical-vehicle key.  Keep an invalid record
    // isolated for diagnostics, but never use MV Track No. as the asset key.
    return normalizedMotorNo(row.motorNumber) || `INVALID-MOTOR:${row.mvTrackNumber.toUpperCase()}`;
  }
}
