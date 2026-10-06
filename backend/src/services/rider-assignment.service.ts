import type { InventoryNsplSyncRowDto, MasterDeploymentSyncRowDto } from "../dto/excel-sync.dto";

export type RiderAccountStatus = "ACTIVE" | "CLOSED";

export interface RiderCurrentAssignment {
  riderName: string;
  riderPhone: string;
  accountStatus: RiderAccountStatus;
  currentMvTrackNo: string;
  vehicleNumber: string;
  motorNo: string | null;
  model: string | null;
  modelCode: string | null;
  hub: string;
  startedAt: string;
  updatedAt: string;
  deploymentStatus: "ACTIVE" | "COMPLETED";
  currentRentalPlan: MasterDeploymentSyncRowDto;
  latestRentalPlanEndDate: string | null;
  latestPaidStatus: string | null;
}

export interface RiderStatusResolution {
  latestCompletedRentalPlan: MasterDeploymentSyncRowDto;
  accountStatus: RiderAccountStatus;
  deploymentStatus: "ACTIVE" | "COMPLETED";
}

export interface MasterRiderAccountMetrics {
  totalOnboarded: number;
  uniqueClosedAccounts: number;
  activeAccounts: number;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : value.trim();
}

function normalizeKey(value: string): string {
  const upper = value.trim().toUpperCase();
  const alphanumeric = upper.replace(/[^A-Z0-9]/g, "");
  if (!alphanumeric) {
    return "";
  }
  return alphanumeric.replace(/(^|[A-Z])0+(?=\d)/g, "$1");
}

function toComparableDate(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function isPaidStatusClosed(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "closed a/c";
}

function isPlanStart(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "plan start";
}

function normalizePaidStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isOnboardingPaidStatus(value: string | null | undefined): boolean {
  const normalized = normalizePaidStatus(value);
  return (
    normalized === "" ||
    normalized === "closedac" ||
    normalized === "pauseaccount" ||
    normalized === "pauseacccount" ||
    normalized === "planrenewed"
  );
}

function isClosedAccountPaidStatus(value: string | null | undefined): boolean {
  const normalized = normalizePaidStatus(value);
  return (
    normalized === "closedac" ||
    normalized === "pauseaccount" ||
    normalized === "pauseacccount" ||
    normalized === "planrenewed"
  );
}

export class RiderAssignmentService {
  calculateMasterRiderAccountMetrics(masterRows: MasterDeploymentSyncRowDto[]): MasterRiderAccountMetrics {
    let totalOnboarded = 0;
    const closedPhones = new Set<string>();

    for (const row of masterRows) {
      if (!isPlanStart(row.fddStatus) || !isOnboardingPaidStatus(row.paidStatus)) {
        continue;
      }
      totalOnboarded += 1;
      if (isClosedAccountPaidStatus(row.paidStatus)) {
        const phone = normalizePhone(row.phone) || "(blank)";
        const hub = normalizeKey(row.hub) || "(blank)";
        closedPhones.add(`${hub}|${phone}`);
      }
    }

    return {
      totalOnboarded,
      uniqueClosedAccounts: closedPhones.size,
      activeAccounts: totalOnboarded - closedPhones.size,
    };
  }

  getLatestCompletedRentalPlan(rows: MasterDeploymentSyncRowDto[]): MasterDeploymentSyncRowDto | null {
    if (rows.length === 0) {
      return null;
    }

    const rowsWithValidEndDate = rows.filter((row) => Number.isFinite(toComparableDate(row.returnDate)));
    const candidates = rowsWithValidEndDate.length > 0 ? rowsWithValidEndDate : rows;
    return [...candidates].sort((left, right) => {
      const rightDate = toComparableDate(right.returnDate);
      const leftDate = toComparableDate(left.returnDate);
      if (rightDate === leftDate) {
        return right.rowNumber - left.rowNumber;
      }
      return rightDate - leftDate;
    })[0];
  }

  getCurrentRentalPlan(rows: MasterDeploymentSyncRowDto[]): MasterDeploymentSyncRowDto | null {
    const planStartsWithValidStartDate = rows.filter(
      (row) => isPlanStart(row.fddStatus) && Number.isFinite(toComparableDate(row.deploymentDate))
    );
    if (planStartsWithValidStartDate.length === 0) {
      return null;
    }

    return [...planStartsWithValidStartDate].sort((left, right) => {
      const rightDate = toComparableDate(right.deploymentDate);
      const leftDate = toComparableDate(left.deploymentDate);
      if (rightDate === leftDate) {
        return right.rowNumber - left.rowNumber;
      }
      return rightDate - leftDate;
    })[0];
  }

  resolveRiderStatus(rows: MasterDeploymentSyncRowDto[]): RiderStatusResolution | null {
    const latestCompletedRentalPlan = this.getLatestCompletedRentalPlan(rows);
    if (!latestCompletedRentalPlan) {
      return null;
    }

    const accountStatus: RiderAccountStatus = isPaidStatusClosed(latestCompletedRentalPlan.paidStatus)
      ? "CLOSED"
      : "ACTIVE";
    return {
      latestCompletedRentalPlan,
      accountStatus,
      deploymentStatus: accountStatus === "CLOSED" ? "COMPLETED" : "ACTIVE",
    };
  }

  buildCurrentAssignments(
    masterRows: MasterDeploymentSyncRowDto[],
    inventoryRows: InventoryNsplSyncRowDto[],
    synchronizedAt: string
  ): RiderCurrentAssignment[] {
    const inventoryByMotorNo = new Map<string, InventoryNsplSyncRowDto>();
    for (const row of inventoryRows) {
      const key = normalizeKey(row.motorNumber ?? "");
      if (!key || inventoryByMotorNo.has(key)) {
        continue;
      }
      inventoryByMotorNo.set(key, row);
    }

    const rowsByRider = new Map<string, MasterDeploymentSyncRowDto[]>();
    for (const row of masterRows) {
      const phone = normalizePhone(row.phone);
      if (
        !/^\d{10,15}$/.test(phone) ||
        !row.rider.trim() ||
        !row.mvTrackNumber.trim() ||
        !Number.isFinite(toComparableDate(row.deploymentDate))
      ) {
        continue;
      }
      const key = phone.length > 0 ? phone : `missing-phone-${row.rowNumber}`;
      const existing = rowsByRider.get(key) ?? [];
      existing.push(row);
      rowsByRider.set(key, existing);
    }

    const assignments: RiderCurrentAssignment[] = [];
    for (const riderRows of rowsByRider.values()) {
      if (riderRows.length === 0) {
        continue;
      }
      const statusResolution = this.resolveRiderStatus(riderRows);
      if (!statusResolution) {
        continue;
      }
      const currentRentalPlan = this.getCurrentRentalPlan(riderRows);
      if (!currentRentalPlan) {
        continue;
      }
      const { latestCompletedRentalPlan, accountStatus, deploymentStatus } = statusResolution;
      const inventory = inventoryByMotorNo.get(normalizeKey(currentRentalPlan.vehicle));
      // A snapshot is valid only when its current-plan MotorNo joins to Inventory.
      if (!inventory) {
        continue;
      }
      const currentMvTrackNo = inventory.mvTrackNumber.trim();

      assignments.push({
        riderName: currentRentalPlan.rider,
        riderPhone: normalizePhone(currentRentalPlan.phone),
        accountStatus,
        currentMvTrackNo,
        vehicleNumber: inventory.motorNumber ?? "",
        motorNo: inventory.motorNumber,
        model: inventory.model,
        modelCode: inventory.modelCode,
        hub: inventory.hub || currentRentalPlan.hub,
        startedAt: currentRentalPlan.deploymentDate,
        updatedAt: synchronizedAt,
        deploymentStatus,
        currentRentalPlan,
        latestRentalPlanEndDate: latestCompletedRentalPlan.returnDate,
        latestPaidStatus: latestCompletedRentalPlan.paidStatus,
      });
    }

    // MotorNo is the operational identity of an active rider assignment. A
    // workbook can contain the same asset against more than one phone over
    // time, so retain only the most recent current plan for that asset.
    const assignmentByMotorNo = new Map<string, RiderCurrentAssignment>();
    for (const assignment of assignments) {
      const motorNo = normalizeKey(assignment.motorNo ?? assignment.vehicleNumber);
      if (!motorNo) {
        continue;
      }
      const existing = assignmentByMotorNo.get(motorNo);
      if (!existing) {
        assignmentByMotorNo.set(motorNo, assignment);
        continue;
      }

      const assignmentStart = toComparableDate(assignment.startedAt);
      const existingStart = toComparableDate(existing.startedAt);
      if (
        assignmentStart > existingStart ||
        (assignmentStart === existingStart &&
          assignment.currentRentalPlan.rowNumber > existing.currentRentalPlan.rowNumber)
      ) {
        assignmentByMotorNo.set(motorNo, assignment);
      }
    }

    return Array.from(assignmentByMotorNo.values());
  }
}

export const riderAssignmentService = new RiderAssignmentService();
