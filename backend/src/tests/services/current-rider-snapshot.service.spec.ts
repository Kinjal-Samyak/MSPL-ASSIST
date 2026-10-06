import { CurrentRiderSnapshotService, CURRENT_RIDER_SNAPSHOT_CATEGORY } from "../../services/current-rider-snapshot.service";
import type { RiderCurrentAssignment } from "../../services/rider-assignment.service";

function assignment(overrides: Partial<RiderCurrentAssignment> = {}): RiderCurrentAssignment {
  return {
    riderName: "Rider One",
    riderPhone: "9876543210",
    accountStatus: "ACTIVE",
    currentMvTrackNo: "MV-001",
    vehicleNumber: "MTR-001",
    motorNo: "MTR-001",
    model: "Model A",
    modelCode: "MA",
    hub: "Kolkata",
    startedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    deploymentStatus: "ACTIVE",
    currentRentalPlan: {} as RiderCurrentAssignment["currentRentalPlan"],
    latestRentalPlanEndDate: "2026-07-31T00:00:00.000Z",
    latestPaidStatus: "Open",
    ...overrides,
  };
}

describe("CurrentRiderSnapshotService", () => {
  it("persists one current snapshot per Rider Phone Number and removes stale snapshots", async () => {
    const appSetting = {
      findMany: jest.fn().mockResolvedValue([{ settingKey: "current-rider:old-phone" }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({}),
    };
    const service = new CurrentRiderSnapshotService({ appSetting } as any);

    const [snapshot] = await service.persist([assignment()]);

    expect(snapshot).toMatchObject({
      snapshotVersion: 1,
      riderPhone: "9876543210",
      currentPlanStartDate: "2026-07-01T00:00:00.000Z",
      latestRentalPlanEndDate: "2026-07-31T00:00:00.000Z",
      latestPaidStatus: "Open",
    });
    expect(appSetting.findMany).toHaveBeenCalledWith({
      where: { category: CURRENT_RIDER_SNAPSHOT_CATEGORY },
      select: { settingKey: true },
    });
    expect(appSetting.deleteMany).toHaveBeenCalledWith({ where: { settingKey: { in: ["current-rider:old-phone"] } } });
    expect(appSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { settingKey: "current-rider:9876543210" } })
    );
  });

  it("returns only valid persisted current-rider snapshots", async () => {
    const valid = { ...assignment(), snapshotVersion: 1, currentPlanStartDate: "2026-07-01T00:00:00.000Z" };
    const service = new CurrentRiderSnapshotService({
      appSetting: { findMany: jest.fn().mockResolvedValue([{ value: valid }, { value: { riderPhone: "bad" } }]) },
    } as any);

    await expect(service.list()).resolves.toEqual([valid]);
  });
});
