import { createHash } from "node:crypto";
import type { PrismaClient, RentalStatus } from "@prisma/client";
import {
  EXCEL_SYNC_INVENTORY_NSPL_CATEGORY,
  EXCEL_SYNC_MASTER_DEPLOYMENT_CATEGORY,
} from "../constants/excel-sync.constants";
import type {
  DeploymentSourceRecordDto,
  InventorySourceRecordDto,
  LookupHubSourceRecordDto,
  LookupIssueCategorySourceRecordDto,
  LookupPlanSourceRecordDto,
  LookupStatusSourceRecordDto,
  LookupTechnicianSourceRecordDto,
  LookupVehicleModelSourceRecordDto,
} from "../dto/operational-provider.dto";
import type { InventoryNsplSyncRowDto, MasterDeploymentSyncRowDto } from "../dto/excel-sync.dto";
import type { OperationalDataSource } from "./operational-data.datasource";
import { PrismaOperationalDataSource } from "./prisma-operational-data.datasource";
import { riderAssignmentService, type RiderCurrentAssignment } from "../services/rider-assignment.service";
import { CurrentRiderSnapshotService } from "../services/current-rider-snapshot.service";

interface SnapshotWrapper {
  payload?: unknown;
}

interface SnapshotCache {
  refreshedAt: number;
  masterRows: MasterDeploymentSyncRowDto[];
  inventoryRows: InventoryNsplSyncRowDto[];
}

const SNAPSHOT_CACHE_TTL_MS = 30 * 1000;

function stableId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function toIso(value: string | null): string {
  const candidate = value ?? "";
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return new Date(0).toISOString();
  }

  return date.toISOString();
}

export interface MotorNoSyncMetrics {
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
  missingMotorNoValues: string[];
}

function customerIdentityKey(assignment: RiderCurrentAssignment): string {
  if (assignment.riderPhone.trim().length > 0) {
    return assignment.riderPhone;
  }
  return `unresolved:${assignment.currentMvTrackNo}:${toIso(assignment.startedAt)}`;
}

function normalizeRelationshipKey(value: string): string {
  const upper = value.trim().toUpperCase();
  const alphanumeric = upper.replace(/[^A-Z0-9]/g, "");
  if (!alphanumeric) {
    return "";
  }
  return alphanumeric.replace(/(^|[A-Z])0+(?=\d)/g, "$1");
}

function mapDeploymentStatus(status: string): RentalStatus {
  const normalized = status.trim().toUpperCase();
  if (normalized.includes("ACTIVE")) {
    return "ACTIVE";
  }
  if (normalized.includes("PENDING")) {
    return "PENDING";
  }
  if (normalized.includes("MAINT")) {
    return "MAINTENANCE";
  }
  return "COMPLETED";
}

function parsePayload<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const wrapper = value as SnapshotWrapper;
  if (!wrapper.payload || typeof wrapper.payload !== "object") {
    return null;
  }

  return wrapper.payload as T;
}

export class SyncedOperationalDataSource implements OperationalDataSource {
  private cache: SnapshotCache | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly fallback: OperationalDataSource = new PrismaOperationalDataSource(prisma),
    private readonly snapshotService: CurrentRiderSnapshotService = new CurrentRiderSnapshotService(prisma)
  ) {}

  async listInventoryRecords(): Promise<InventorySourceRecordDto[]> {
    const data = await this.getSnapshots();
    // A newly provisioned Training database can have the standard deployment
    // seed before its first Excel inventory sync. In that state, use the
    // persisted operational records so Fleet remains usable; once an
    // inventory snapshot exists it remains the authoritative source.
    if (data.inventoryRows.length === 0) {
      return this.fallback.listInventoryRecords();
    }
    return this.toInventorySourceRows(data.masterRows, this.uniqueInventoryRows(data.inventoryRows));
  }

  async listRiderAssignments(): Promise<RiderCurrentAssignment[]> {
    const persisted = await this.snapshotService.list();
    if (persisted.length > 0) {
      return persisted;
    }
    return this.computeCurrentRiderSnapshots();
  }

  async computeCurrentRiderSnapshots(): Promise<RiderCurrentAssignment[]> {
    const snapshots = await this.getSnapshots();
    return riderAssignmentService.buildCurrentAssignments(
      snapshots.masterRows,
      this.uniqueInventoryRows(snapshots.inventoryRows),
      new Date().toISOString()
    );
  }

  async getMotorNoSyncMetrics(): Promise<MotorNoSyncMetrics> {
    const snapshots = await this.getSnapshots();
    const masterMotorNos = new Set<string>();
    let blankMasterMotorNo = 0;
    let duplicateMasterMotorNo = 0;
    for (const row of snapshots.masterRows) {
      const motorNo = normalizeRelationshipKey(row.vehicle);
      if (!motorNo) {
        blankMasterMotorNo += 1;
      } else if (masterMotorNos.has(motorNo)) {
        duplicateMasterMotorNo += 1;
      } else {
        masterMotorNos.add(motorNo);
      }
    }
    const inventoryMotorNos = new Set<string>();
    let blankInventoryMotorNo = 0;
    let duplicateInventoryMotorNo = 0;
    for (const row of snapshots.inventoryRows) {
      const motorNo = normalizeRelationshipKey(row.motorNumber ?? "");
      if (!motorNo) {
        blankInventoryMotorNo += 1;
        continue;
      }
      if (inventoryMotorNos.has(motorNo)) {
        duplicateInventoryMotorNo += 1;
      }
      inventoryMotorNos.add(motorNo);
    }
    const missingMotorNoValues = Array.from(masterMotorNos).filter((motorNo) => !inventoryMotorNos.has(motorNo));
    const motorNoSuccessfullyMatched = masterMotorNos.size - missingMotorNoValues.length;
    return {
      masterDeploymentRowsRead: snapshots.masterRows.length,
      uniqueMotorNoFound: masterMotorNos.size,
      blankMasterMotorNo,
      duplicateMasterMotorNo,
      inventoryRows: snapshots.inventoryRows.length,
      distinctInventoryMotorNo: inventoryMotorNos.size,
      blankInventoryMotorNo,
      motorNoSuccessfullyMatched,
      missingMotorNo: masterMotorNos.size - motorNoSuccessfullyMatched,
      duplicateInventoryMotorNo,
      missingMotorNoValues,
    };
  }

  async getMasterRiderAccountMetrics() {
    const snapshots = await this.getSnapshots();
    return riderAssignmentService.calculateMasterRiderAccountMetrics(snapshots.masterRows);
  }

  async findInventoryByMvTrack(mvTrackNumber: string): Promise<InventorySourceRecordDto[]> {
    const rows = await this.listInventoryRecords();
    const target = normalizeRelationshipKey(mvTrackNumber);
    return rows.filter((row) => normalizeRelationshipKey(row.mvTrackNumber) === target);
  }

  async findInventoryByVin(vin: string): Promise<InventorySourceRecordDto[]> {
    const rows = await this.listInventoryRecords();
    const target = vin.trim().toUpperCase();
    return rows.filter((row) => (row.vin ?? "").toUpperCase() === target);
  }

  async findInventoryByVehicleNumber(vehicleNumber: string): Promise<InventorySourceRecordDto[]> {
    const rows = await this.listInventoryRecords();
    const target = vehicleNumber.trim().toUpperCase();
    return rows.filter((row) => row.vehicleNumber.toUpperCase() === target);
  }

  async findDeploymentsByCustomerId(customerId: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.toDeploymentRows();
    return rows.filter((row) => row.customerId === customerId);
  }

  async findDeploymentsByMvTrack(mvTrackNumber: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.toDeploymentRows();
    const target = normalizeRelationshipKey(mvTrackNumber);
    return rows.filter((row) => normalizeRelationshipKey(row.mvTrackNumber) === target);
  }

  async findDeploymentsByPhone(phone: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.toDeploymentRows();
    const target = phone.replace(/\D/g, "");
    return rows.filter((row) => row.customerPhone.replace(/\D/g, "").includes(target));
  }

  async findDeploymentsByRiderName(name: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.toDeploymentRows();
    const target = name.trim().toLowerCase();
    return rows.filter((row) => row.customerName.toLowerCase().includes(target));
  }

  async getLookupHubs(): Promise<LookupHubSourceRecordDto[]> {
    const snapshots = await this.getSnapshots();
    const names = new Set<string>();
    for (const row of snapshots.masterRows) {
      names.add(row.hub.trim());
    }
    for (const row of snapshots.inventoryRows) {
      names.add(row.hub.trim());
    }

    return Array.from(names)
      .filter((item) => item.length > 0)
      .sort((a, b) => a.localeCompare(b))
      .map((hubName) => ({
        id: stableId(`hub:${hubName.toUpperCase()}`),
        name: hubName,
        city: "",
        state: "",
      }));
  }

  async getLookupVehicleModels(): Promise<LookupVehicleModelSourceRecordDto[]> {
    const snapshots = await this.getSnapshots();
    const unique = new Map<string, LookupVehicleModelSourceRecordDto>();
    for (const row of snapshots.inventoryRows) {
      const code = row.modelCode.trim().toUpperCase();
      if (!code || unique.has(code)) {
        continue;
      }

      unique.set(code, {
        id: stableId(`model:${code}`),
        modelCode: code,
        displayName: row.model,
        manufacturer: "",
      });
    }

    return Array.from(unique.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async getLookupPlans(): Promise<LookupPlanSourceRecordDto[]> {
    const snapshots = await this.getSnapshots();
    const unique = new Map<string, LookupPlanSourceRecordDto>();
    for (const row of snapshots.masterRows) {
      const planCode = row.plan.trim().toUpperCase();
      if (!planCode || unique.has(planCode)) {
        continue;
      }

      unique.set(planCode, {
        planCode,
        planName: row.plan,
        description: null,
        active: true,
      });
    }

    return Array.from(unique.values()).sort((a, b) => a.planName.localeCompare(b.planName));
  }

  async getLookupIssueCategories(issueCategoryId?: string): Promise<LookupIssueCategorySourceRecordDto[]> {
    return this.fallback.getLookupIssueCategories(issueCategoryId);
  }

  async getLookupTechnicians(hub?: string): Promise<LookupTechnicianSourceRecordDto[]> {
    return this.fallback.getLookupTechnicians(hub);
  }

  async getLookupWorkshopStatuses(): Promise<LookupStatusSourceRecordDto[]> {
    return this.fallback.getLookupWorkshopStatuses();
  }

  async getLookupVehicleStatuses(): Promise<LookupStatusSourceRecordDto[]> {
    const snapshots = await this.getSnapshots();
    const unique = new Set<string>();
    for (const row of snapshots.inventoryRows) {
      if (row.vehicleStatus.trim().length > 0) {
        unique.add(row.vehicleStatus.trim().toUpperCase());
      }
    }

    if (unique.size === 0) {
      return this.fallback.getLookupVehicleStatuses();
    }

    return Array.from(unique.values()).map((status) => ({
      code: status,
      label: status
        .toLowerCase()
        .split("_")
        .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
        .join(" "),
    }));
  }

  private async getSnapshots(): Promise<SnapshotCache> {
    const now = Date.now();
    if (this.cache && now - this.cache.refreshedAt <= SNAPSHOT_CACHE_TTL_MS) {
      return this.cache;
    }

    const prismaWithDatasetSnapshot = this.prisma as unknown as {
      datasetSnapshot?: {
        findMany?: (args: unknown) => Promise<Array<{ snapshotKey: string; payload: unknown }>>;
      };
    };
    const structuredRows =
      typeof prismaWithDatasetSnapshot.datasetSnapshot?.findMany === "function"
        ? await prismaWithDatasetSnapshot.datasetSnapshot.findMany({
            where: {
              operationalDataset: {
                datasetCode: "DEFAULT_OPERATIONAL_DATASET",
                active: true,
              },
              OR: [
                { snapshotKey: { startsWith: "master-deployment:" } },
                { snapshotKey: { startsWith: "inventory-nspl:" } },
              ],
            },
            select: {
              snapshotKey: true,
              payload: true,
            },
          })
        : [];

    const hasStructuredSnapshots = structuredRows.length > 0;
    const [masterRows, inventoryRows] = hasStructuredSnapshots
      ? [
          structuredRows
            .filter((row) => row.snapshotKey.startsWith("master-deployment:"))
            .map((row) => ({ value: row.payload })),
          structuredRows
            .filter((row) => row.snapshotKey.startsWith("inventory-nspl:"))
            .map((row) => ({ value: row.payload })),
        ]
      : await Promise.all([
          this.prisma.appSetting.findMany({
            where: { category: EXCEL_SYNC_MASTER_DEPLOYMENT_CATEGORY },
            select: { value: true },
          }),
          this.prisma.appSetting.findMany({
            where: { category: EXCEL_SYNC_INVENTORY_NSPL_CATEGORY },
            select: { value: true },
          }),
        ]);

    const parsedMasterRows: MasterDeploymentSyncRowDto[] = [];
    for (const row of masterRows) {
      const payload = parsePayload<MasterDeploymentSyncRowDto>(row.value);
      if (payload) {
        parsedMasterRows.push(payload);
      }
    }

    const parsedInventoryRows: InventoryNsplSyncRowDto[] = [];
    for (const row of inventoryRows) {
      const payload = parsePayload<InventoryNsplSyncRowDto>(row.value);
      if (payload) {
        parsedInventoryRows.push(payload);
      }
    }

    this.cache = {
      refreshedAt: now,
      masterRows: parsedMasterRows,
      inventoryRows: parsedInventoryRows,
    };
    return this.cache;
  }

  private async toDeploymentRows(): Promise<DeploymentSourceRecordDto[]> {
    const assignments = await this.listRiderAssignments();
    const deployments = assignments.map((assignment) => {
      const deploymentId = stableId(
        `deployment:${assignment.riderPhone}:${assignment.currentMvTrackNo}:${toIso(assignment.startedAt)}`
      );
      const customerId = stableId(
        `customer:${customerIdentityKey(assignment)}`
      );
      const hubId = stableId(`hub:${assignment.hub.toUpperCase()}`);
      return {
        deploymentId,
        customerId,
        customerName: assignment.riderName,
        customerPhone: assignment.riderPhone,
        vehicleNumber: assignment.vehicleNumber,
        mvTrackNumber: assignment.currentMvTrackNo,
        rentalStatus: assignment.deploymentStatus === "ACTIVE" ? "ACTIVE" : "COMPLETED",
        hubId,
        hubName: assignment.hub,
        modelName: assignment.model ?? assignment.vehicleNumber,
        startedAt: toIso(assignment.startedAt),
        updatedAt: toIso(assignment.updatedAt),
      } satisfies DeploymentSourceRecordDto;
    });

    return deployments.sort((left, right) => {
      const leftTs = new Date(left.startedAt).getTime();
      const rightTs = new Date(right.startedAt).getTime();
      return rightTs - leftTs;
    });
  }

  /** Returns one deterministic inventory row per physical MotorNo. */
  private uniqueInventoryRows(rows: InventoryNsplSyncRowDto[]): InventoryNsplSyncRowDto[] {
    const unique = new Map<string, InventoryNsplSyncRowDto>();
    for (const row of rows) {
      const motorNo = normalizeRelationshipKey(row.motorNumber ?? "");
      // Blank MotorNo records remain visible to diagnostics but cannot represent
      // a uniquely identifiable physical vehicle in the operational view.
      if (!motorNo) {
        continue;
      }
      const existing = unique.get(motorNo);
      if (!existing || row.rowNumber >= existing.rowNumber) {
        unique.set(motorNo, row);
      }
    }
    return Array.from(unique.values());
  }

  private toInventorySourceRows(
    masterRows: MasterDeploymentSyncRowDto[],
    inventoryRows: InventoryNsplSyncRowDto[]
  ): InventorySourceRecordDto[] {
    const deployedMotorNumbers = new Set(
      masterRows
        .map((row) => normalizeRelationshipKey(row.vehicle))
        .filter((motorNumber) => motorNumber.length > 0)
    );
    const assignments = riderAssignmentService.buildCurrentAssignments(
      masterRows,
      inventoryRows,
      new Date().toISOString()
    );
    const assignmentByMvTrack = new Map<string, RiderCurrentAssignment>();
    for (const assignment of assignments) {
      assignmentByMvTrack.set(normalizeRelationshipKey(assignment.currentMvTrackNo), assignment);
    }

    const rows = inventoryRows.map((row) => {
      const assignment = assignmentByMvTrack.get(normalizeRelationshipKey(row.mvTrackNumber));
      const motorNumber = normalizeRelationshipKey(row.motorNumber ?? "");
      const rentalStatus = deployedMotorNumbers.has(motorNumber)
        ? "ACTIVE"
        : mapDeploymentStatus(row.vehicleStatus);
      const createdAt = assignment ? toIso(assignment.startedAt) : new Date(0).toISOString();
      const updatedAt = assignment ? toIso(assignment.updatedAt) : new Date().toISOString();
      return {
        sourceId: stableId(`inventory:${row.mvTrackNumber.toUpperCase()}`),
        mvTrackNumber: row.mvTrackNumber,
        vehicleNumber: assignment?.vehicleNumber ?? row.mvTrackNumber,
        registrationNumber: null,
        vin: row.vin,
        chassisNumber: row.chassisNumber,
        motorNumber: row.motorNumber,
        batteryNumber: row.batteryNumber,
        modelCode: row.modelCode,
        modelName: row.model,
        color: null,
        variant: null,
        manufacturer: null,
        hubId: stableId(`hub:${row.hub.toUpperCase()}`),
        hubName: row.hub,
        iotImei: row.iotDevice,
        iotSimNumber: null,
        ownership: null,
        purchaseDate: null,
        assetCost: null,
        warrantyExpiryDate: null,
        registrationExpiryDate: null,
        insuranceExpiryDate: null,
        fitnessExpiryDate: null,
        pucExpiryDate: null,
        fdd: null,
        currentCustomerId: assignment
          ? stableId(`customer:${customerIdentityKey(assignment)}`)
          : null,
        currentCustomerName: assignment?.riderName ?? null,
        currentCustomerPhone: assignment?.riderPhone ?? null,
        rentalStatus,
        createdAt,
        updatedAt,
      } satisfies InventorySourceRecordDto;
    });

    return rows.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }
}
