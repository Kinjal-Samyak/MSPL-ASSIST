import type { CustomerStatus, Hub, Prisma, PrismaClient, RentalStatus, VehicleModel } from "@prisma/client";
import { SyncedOperationalDataSource } from "../datasources/synced-operational-data.datasource";
import { prismaClient } from "../database";
import { logger } from "../utils/logger";
import { CurrentRiderSnapshotService } from "./current-rider-snapshot.service";

type OperationOutcome = "insert" | "update" | "skipped" | "rejected";

interface PersistenceOperationLog {
  entity: "customer" | "deployment";
  outcome: OperationOutcome;
  key: string;
  reason?: string;
}

export interface SyncPersistenceSummary {
  customersInserted: number;
  customersUpdated: number;
  deploymentsInserted: number;
  deploymentsUpdated: number;
  skippedReasons: Record<string, number>;
  operationalMetrics?: {
    masterDeploymentRowsRead: number;
    uniqueMotorNoFound: number;
    blankMasterMotorNo: number;
    duplicateMasterMotorNo: number;
    inventoryRows: number;
    distinctInventoryMotorNo: number;
    blankInventoryMotorNo: number;
    motorNoSuccessfullyMatched: number;
    missingMotorNo: number;
    duplicateInventoryMotorNo: number;
    snapshotsCreated: number;
  };
}

function incrementReason(reasons: Record<string, number>, reason: string): void {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function normalizeMobile(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return digits;
}

function normalizeModelCode(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export class SyncPersistenceService {
  constructor(
    private readonly prisma: PrismaClient = prismaClient,
    private readonly dataSource: SyncedOperationalDataSource = new SyncedOperationalDataSource(prismaClient),
    private readonly snapshotService: CurrentRiderSnapshotService = new CurrentRiderSnapshotService(prisma)
  ) {}

  async persistJoinedRecords(): Promise<SyncPersistenceSummary> {
    const dataSourceWithSnapshotBuild = this.dataSource as SyncedOperationalDataSource & {
      computeCurrentRiderSnapshots?: SyncedOperationalDataSource["listRiderAssignments"];
    };
    const joinedRows = dataSourceWithSnapshotBuild.computeCurrentRiderSnapshots
      ? await dataSourceWithSnapshotBuild.computeCurrentRiderSnapshots()
      : await this.dataSource.listRiderAssignments();

    logger.info({
      scope: "excel-sync",
      event: "Persistence Input Preview",
      totalInventoryRows: (await this.dataSource.listInventoryRecords()).length,
      joinedRows: joinedRows.length,
      preview: joinedRows.slice(0, 5).map((row) => ({
        rider: row.riderName,
        phone: row.riderPhone,
        accountStatus: row.accountStatus,
        currentMvTrackNo: row.currentMvTrackNo,
        motorNo: row.motorNo,
        deploymentStatus: row.deploymentStatus,
        hub: row.hub,
        model: row.model,
        vehicleNumber: row.vehicleNumber,
      })),
    });

    const summary: SyncPersistenceSummary = {
      customersInserted: 0,
      customersUpdated: 0,
      deploymentsInserted: 0,
      deploymentsUpdated: 0,
      skippedReasons: {},
    };

    for (const row of joinedRows) {
      const operationLogs: PersistenceOperationLog[] = [];
      const mobile = normalizeMobile(row.riderPhone);
      const modelCode = normalizeModelCode(row.modelCode);
      const hubName = row.hub.trim();
      const modelName = row.model?.trim() ?? "";
      if (!mobile) {
        incrementReason(summary.skippedReasons, "invalid_customer_mobile");
        operationLogs.push({
          entity: "customer",
          outcome: "rejected",
          key: row.riderPhone || "unknown",
          reason: "invalid_customer_mobile",
        });
        logger.info({
          scope: "excel-sync",
          event: "Persistence Operation",
          mvTrackNumber: row.currentMvTrackNo,
          operations: operationLogs,
        });
        continue;
      }
      if (!modelCode) {
        incrementReason(summary.skippedReasons, "missing_model_code");
        operationLogs.push({
          entity: "deployment",
          outcome: "rejected",
          key: row.currentMvTrackNo,
          reason: "missing_model_code",
        });
        logger.info({
          scope: "excel-sync",
          event: "Persistence Operation",
          mvTrackNumber: row.currentMvTrackNo,
          operations: operationLogs,
        });
        continue;
      }
      if (!hubName || !row.currentMvTrackNo || !row.vehicleNumber) {
        incrementReason(summary.skippedReasons, "missing_required_deployment_fields");
        operationLogs.push({
          entity: "deployment",
          outcome: "rejected",
          key: row.currentMvTrackNo || "unknown",
          reason: "missing_required_deployment_fields",
        });
        logger.info({
          scope: "excel-sync",
          event: "Persistence Operation",
          mvTrackNumber: row.currentMvTrackNo,
          operations: operationLogs,
        });
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          const customer = await this.upsertCustomer(tx, row, mobile);
          operationLogs.push(customer.log);
          if (customer.log.outcome === "insert") {
            summary.customersInserted += 1;
          } else if (customer.log.outcome === "update") {
            summary.customersUpdated += 1;
          } else if (customer.log.reason) {
            incrementReason(summary.skippedReasons, customer.log.reason);
          }

          const hub = await this.upsertHub(tx, hubName);
          const vehicleModel = await this.upsertVehicleModel(tx, modelCode, modelName);
          const deployment = await this.upsertDeployment(tx, row, customer.id, hub.id, vehicleModel.id);
          operationLogs.push(deployment.log);
          if (deployment.log.outcome === "insert") {
            summary.deploymentsInserted += 1;
          } else if (deployment.log.outcome === "update") {
            summary.deploymentsUpdated += 1;
          } else if (deployment.log.reason) {
            incrementReason(summary.skippedReasons, deployment.log.reason);
          }
        });
      } catch (error) {
        incrementReason(summary.skippedReasons, "transaction_rollback");
        operationLogs.push({
          entity: "deployment",
          outcome: "rejected",
          key: row.currentMvTrackNo,
          reason: error instanceof Error ? error.message : "transaction_rollback",
        });
      }

      logger.info({
        scope: "excel-sync",
        event: "Persistence Operation",
        mvTrackNumber: row.currentMvTrackNo,
        operations: operationLogs,
      });
    }

    logger.info({
      scope: "excel-sync",
      event: "Persistence Summary",
      ...summary,
    });

    await this.snapshotService.persist(joinedRows);
    const dataSourceWithMetrics = this.dataSource as SyncedOperationalDataSource & {
      getMotorNoSyncMetrics?: () => Promise<NonNullable<SyncPersistenceSummary["operationalMetrics"]> & { missingMotorNoValues: string[] }>;
    };
    if (dataSourceWithMetrics.getMotorNoSyncMetrics) {
      const metrics = await dataSourceWithMetrics.getMotorNoSyncMetrics();
      for (const motorNo of metrics.missingMotorNoValues) {
        logger.info({ scope: "excel-sync", event: "Missing MotorNo", motorNo, action: "snapshot_skipped" });
      }
      summary.operationalMetrics = {
        ...metrics,
        snapshotsCreated: joinedRows.length,
      };
    }
    return summary;
  }

  private async upsertCustomer(
    tx: Prisma.TransactionClient,
    row: Awaited<ReturnType<SyncedOperationalDataSource["listRiderAssignments"]>>[number],
    mobile: string
  ): Promise<{ id: string; log: PersistenceOperationLog }> {
    const name = row.riderName.trim();
    if (!name) {
      throw new Error("missing_customer_name");
    }

    const targetStatus: CustomerStatus = row.accountStatus === "CLOSED" ? "INACTIVE" : "ACTIVE";
    const existing = await tx.customer.findFirst({
      where: { registeredMobile: mobile },
      select: { id: true, name: true, whatsAppNumber: true, status: true },
    });
    if (!existing) {
      const created = await tx.customer.create({
        data: {
          name,
          registeredMobile: mobile,
          whatsAppNumber: mobile,
          status: targetStatus,
        },
        select: { id: true },
      });
      return {
        id: created.id,
        log: { entity: "customer", outcome: "insert", key: mobile },
      };
    }

    if (existing.name === name && existing.whatsAppNumber === mobile && existing.status === targetStatus) {
      return {
        id: existing.id,
        log: { entity: "customer", outcome: "skipped", key: mobile, reason: "customer_unchanged" },
      };
    }

    await tx.customer.update({
      where: { id: existing.id },
      data: {
        name,
        whatsAppNumber: mobile,
        status: targetStatus,
      },
    });
    return {
      id: existing.id,
      log: { entity: "customer", outcome: "update", key: mobile },
    };
  }

  private async upsertHub(tx: Prisma.TransactionClient, hubName: string): Promise<Hub> {
    return tx.hub.upsert({
      where: { name: hubName.trim() },
      update: { active: true, deletedAt: null },
      create: { name: hubName.trim(), city: "", state: "", active: true },
    });
  }

  private async upsertVehicleModel(
    tx: Prisma.TransactionClient,
    modelCode: string,
    modelName: string
  ): Promise<VehicleModel> {
    const displayName = modelName.trim().length > 0 ? modelName.trim() : modelCode;
    return tx.vehicleModel.upsert({
      where: { modelCode },
      update: { displayName, active: true, deletedAt: null },
      create: { modelCode, displayName, manufacturer: "", active: true },
    });
  }

  private async upsertDeployment(
    tx: Prisma.TransactionClient,
    row: Awaited<ReturnType<SyncedOperationalDataSource["listRiderAssignments"]>>[number],
    customerId: string,
    hubId: string,
    vehicleModelId: string
  ): Promise<{ id: string; log: PersistenceOperationLog }> {
    const existing = await tx.deployment.findFirst({
      where: { mvTrackNumber: row.currentMvTrackNo.trim() },
      select: {
        id: true,
        customerId: true,
        vehicleNumber: true,
        hubId: true,
        vehicleModelId: true,
        rentalStatus: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const rentalStatus: RentalStatus = row.deploymentStatus === "ACTIVE" ? "ACTIVE" : "COMPLETED";
    if (!existing) {
      const created = await tx.deployment.create({
        data: {
          customerId,
          mvTrackNumber: row.currentMvTrackNo.trim(),
          vehicleNumber: row.vehicleNumber.trim(),
          vehicleModelId,
          hubId,
          rentalStatus,
        },
        select: { id: true },
      });
      return {
        id: created.id,
        log: { entity: "deployment", outcome: "insert", key: row.currentMvTrackNo },
      };
    }

    const unchanged =
      existing.customerId === customerId &&
      existing.vehicleNumber === row.vehicleNumber.trim() &&
      existing.hubId === hubId &&
      existing.vehicleModelId === vehicleModelId &&
      existing.rentalStatus === rentalStatus;
    if (unchanged) {
      return {
        id: existing.id,
        log: {
          entity: "deployment",
          outcome: "skipped",
          key: row.currentMvTrackNo,
          reason: "deployment_unchanged",
        },
      };
    }

    await tx.deployment.update({
      where: { id: existing.id },
      data: {
        customerId,
        vehicleNumber: row.vehicleNumber.trim(),
        hubId,
        vehicleModelId,
        rentalStatus,
      },
    });
    return {
      id: existing.id,
      log: { entity: "deployment", outcome: "update", key: row.currentMvTrackNo },
    };
  }
}

export const syncPersistenceService = new SyncPersistenceService();
