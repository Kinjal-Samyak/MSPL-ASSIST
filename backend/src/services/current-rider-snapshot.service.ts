import type { Prisma, PrismaClient } from "@prisma/client";
import type { RiderCurrentAssignment } from "./rider-assignment.service";
import { prismaClient } from "../database";

export const CURRENT_RIDER_SNAPSHOT_CATEGORY = "CURRENT_RIDER_SNAPSHOT";
const SNAPSHOT_KEY_PREFIX = "current-rider:";

export interface CurrentRiderSnapshot extends RiderCurrentAssignment {
  snapshotVersion: 1;
  currentPlanStartDate: string;
}

function snapshotKey(phone: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${phone}`;
}

function isSnapshot(value: unknown): value is CurrentRiderSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CurrentRiderSnapshot>;
  return (
    row.snapshotVersion === 1 &&
    typeof row.riderPhone === "string" &&
    typeof row.currentMvTrackNo === "string" &&
    typeof row.currentPlanStartDate === "string"
  );
}

/**
 * Persists the one-row-per-Rider operational projection produced by the
 * centralized Rider assignment resolver. It deliberately reuses AppSetting
 * JSON storage so this architectural layer requires no schema migration.
 */
export class CurrentRiderSnapshotService {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  fromAssignments(assignments: RiderCurrentAssignment[]): CurrentRiderSnapshot[] {
    return assignments.map((assignment) => ({
      ...assignment,
      snapshotVersion: 1,
      currentPlanStartDate: assignment.startedAt,
    }));
  }

  async persist(assignments: RiderCurrentAssignment[]): Promise<CurrentRiderSnapshot[]> {
    const snapshots = this.fromAssignments(assignments);
    const appSetting = (this.prisma as unknown as {
      appSetting?: {
        findMany?: (args: unknown) => Promise<Array<{ settingKey: string }>>;
        deleteMany?: (args: unknown) => Promise<unknown>;
        upsert?: (args: unknown) => Promise<unknown>;
      };
    }).appSetting;
    if (!appSetting?.findMany || !appSetting.deleteMany || !appSetting.upsert) {
      return snapshots;
    }

    const nextKeys = new Set(snapshots.map((snapshot) => snapshotKey(snapshot.riderPhone)));
    const existing = await appSetting.findMany({
      where: { category: CURRENT_RIDER_SNAPSHOT_CATEGORY },
      select: { settingKey: true },
    });
    const staleKeys = existing.map((row) => row.settingKey).filter((key) => !nextKeys.has(key));
    if (staleKeys.length > 0) {
      await appSetting.deleteMany({ where: { settingKey: { in: staleKeys } } });
    }

    for (const snapshot of snapshots) {
      const settingKey = snapshotKey(snapshot.riderPhone);
      const value = JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue;
      await appSetting.upsert({
        where: { settingKey },
        create: { category: CURRENT_RIDER_SNAPSHOT_CATEGORY, settingKey, value, editableByAdmin: false },
        update: { category: CURRENT_RIDER_SNAPSHOT_CATEGORY, value, editableByAdmin: false },
      });
    }
    return snapshots;
  }

  async list(): Promise<CurrentRiderSnapshot[]> {
    const appSetting = (this.prisma as unknown as {
      appSetting?: { findMany?: (args: unknown) => Promise<Array<{ value: unknown }>> };
    }).appSetting;
    if (!appSetting?.findMany) return [];

    const rows = await appSetting.findMany({
      where: { category: CURRENT_RIDER_SNAPSHOT_CATEGORY },
      select: { value: true },
    });
    return rows.map((row) => row.value).filter(isSnapshot);
  }
}

export const currentRiderSnapshotService = new CurrentRiderSnapshotService();
