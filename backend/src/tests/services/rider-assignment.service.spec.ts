import type { InventoryNsplSyncRowDto, MasterDeploymentSyncRowDto } from "../../dto/excel-sync.dto";
import { riderAssignmentService } from "../../services/rider-assignment.service";

const synchronizedAt = "2026-07-15T00:00:00.000Z";

function masterRow(overrides: Partial<MasterDeploymentSyncRowDto> = {}): MasterDeploymentSyncRowDto {
  return {
    rowNumber: 2,
    rider: "Rider A",
    phone: "9876543210",
    hub: "Taratala",
    vehicle: "MTR-1",
    mvTrackNumber: "MV-1",
    plan: "Plan",
    status: "ACTIVE",
    deploymentDate: "2026-01-01T00:00:00.000Z",
    returnDate: "2026-01-31T00:00:00.000Z",
    coordinator: "C1",
    paidStatus: "Open",
    fddStatus: "Plan Start",
    isLatestForRider: true,
    ...overrides,
  };
}

function inventoryRow(overrides: Partial<InventoryNsplSyncRowDto> = {}): InventoryNsplSyncRowDto {
  return {
    rowNumber: 2,
    mvTrackNumber: "MV-1",
    model: "Model 1",
    modelCode: "M1",
    vehicleStatus: "DEPLOYED",
    hub: "Taratala",
    batteryNumber: null,
    iotDevice: null,
    vin: null,
    motorNumber: "MTR-1",
    chassisNumber: null,
    ...overrides,
  };
}

describe("RiderAssignmentService", () => {
  it("matches the Master Deployment pivot rules for onboarded, closed, and active accounts", () => {
    const metrics = riderAssignmentService.calculateMasterRiderAccountMetrics([
      masterRow({ rowNumber: 2, phone: "9876543210", fddStatus: "Plan Start", paidStatus: "" }),
      masterRow({ rowNumber: 3, phone: "9876543210", fddStatus: "Plan Start", paidStatus: "Plan renewed" }),
      masterRow({ rowNumber: 4, phone: "9876543211", fddStatus: "Plan Start", paidStatus: "Closed /ac" }),
      masterRow({ rowNumber: 5, phone: "9876543212", fddStatus: "Plan Start", paidStatus: "Pause Acccount" }),
      masterRow({ rowNumber: 6, phone: "9876543213", fddStatus: "Plan Start", paidStatus: "Exchange" }),
      masterRow({ rowNumber: 7, phone: "9876543214", fddStatus: "Plan Start", paidStatus: "Upgrade" }),
      masterRow({ rowNumber: 8, phone: "9876543215", fddStatus: "Other", paidStatus: "Open" }),
      masterRow({ rowNumber: 9, phone: "9876543210", hub: "Hub B", fddStatus: "Plan Start", paidStatus: "Plan renewed" }),
      masterRow({ rowNumber: 10, phone: "", hub: "Hub B", fddStatus: "Plan Start", paidStatus: "Closed a/c" }),
    ]);

    expect(metrics).toEqual({
      totalOnboarded: 6,
      uniqueClosedAccounts: 5,
      activeAccounts: 1,
    });
  });

  it("ignores asset-presence rows that do not contain a valid rider identity", () => {
    const assignments = riderAssignmentService.buildCurrentAssignments(
      [masterRow({ rider: "", phone: "", vehicle: "MTR-ASSET" })],
      [inventoryRow({ motorNumber: "MTR-ASSET" })],
      synchronizedAt
    );

    expect(assignments).toEqual([]);
  });

  it("marks a rider with one deployment active when its paid status is not Closed a/c", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments([masterRow()], [inventoryRow()], synchronizedAt);

    expect(assignment).toMatchObject({ accountStatus: "ACTIVE", deploymentStatus: "ACTIVE" });
  });

  it("marks a rider with one rental plan closed when its paid status is Closed a/c", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [masterRow({ paidStatus: "Closed a/c" })],
      [inventoryRow()],
      synchronizedAt
    );

    expect(assignment).toMatchObject({ accountStatus: "CLOSED", deploymentStatus: "COMPLETED" });
  });

  it("uses the latest End Date record when a rider has multiple deployments", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, mvTrackNumber: "MV-OLD", returnDate: "2026-03-01T00:00:00.000Z", paidStatus: "Closed a/c" }),
        masterRow({ rowNumber: 3, mvTrackNumber: "MV-LATEST", returnDate: "2026-04-01T00:00:00.000Z", paidStatus: "Open" }),
      ],
      [inventoryRow({ mvTrackNumber: "MV-LATEST" })],
      synchronizedAt
    );

    expect(assignment).toMatchObject({
      currentMvTrackNo: "MV-LATEST",
      startedAt: "2026-01-01T00:00:00.000Z",
      accountStatus: "ACTIVE",
      deploymentStatus: "ACTIVE",
    });
  });

  it("does not retain a historical Closed a/c when the latest deployment is active", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, returnDate: "2026-02-01T00:00:00.000Z", paidStatus: "Closed a/c" }),
        masterRow({ rowNumber: 3, returnDate: "2026-05-01T00:00:00.000Z", paidStatus: "Open" }),
      ],
      [inventoryRow()],
      synchronizedAt
    );

    expect(assignment).toMatchObject({ accountStatus: "ACTIVE", deploymentStatus: "ACTIVE" });
  });

  it("marks a rider closed when the latest End Date record has Paid Status Closed a/c", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, returnDate: "2026-02-01T00:00:00.000Z", paidStatus: "Open" }),
        masterRow({ rowNumber: 3, returnDate: "2026-06-01T00:00:00.000Z", paidStatus: "Closed a/c" }),
      ],
      [inventoryRow()],
      synchronizedAt
    );

    expect(assignment).toMatchObject({ accountStatus: "CLOSED", deploymentStatus: "COMPLETED" });
  });

  it("ignores missing or invalid End Dates when a valid latest End Date exists", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, mvTrackNumber: "MV-MISSING", returnDate: null, paidStatus: "Closed a/c" }),
        masterRow({ rowNumber: 3, mvTrackNumber: "MV-INVALID", returnDate: "not-a-date", paidStatus: "Closed a/c" }),
        masterRow({ rowNumber: 4, mvTrackNumber: "MV-VALID", returnDate: "2026-07-01T00:00:00.000Z", paidStatus: "Open" }),
      ],
      [inventoryRow({ mvTrackNumber: "MV-VALID" })],
      synchronizedAt
    );

    expect(assignment).toMatchObject({
      currentMvTrackNo: "MV-VALID",
      accountStatus: "ACTIVE",
      deploymentStatus: "ACTIVE",
    });
  });

  it("uses the latest End Date record for riders with exchanged vehicles", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, mvTrackNumber: "MV-OLD", returnDate: "2026-04-01T00:00:00.000Z", paidStatus: "Open" }),
        masterRow({ rowNumber: 3, mvTrackNumber: "MV-NEW", vehicle: "MTR-NEW", returnDate: "2026-07-01T00:00:00.000Z", paidStatus: "Closed a/c" }),
      ],
      [inventoryRow({ mvTrackNumber: "MV-NEW", motorNumber: "MTR-NEW" })],
      synchronizedAt
    );

    expect(assignment).toMatchObject({
      currentMvTrackNo: "MV-NEW",
      vehicleNumber: "MTR-NEW",
      accountStatus: "CLOSED",
      deploymentStatus: "COMPLETED",
    });
  });

  it("uses the latest Plan Start for the current assignment, independently of the latest End Date", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({
          rowNumber: 2,
          mvTrackNumber: "MV-HISTORICAL",
          deploymentDate: "2026-01-01T00:00:00.000Z",
          returnDate: "2026-08-01T00:00:00.000Z",
          paidStatus: "Closed a/c",
        }),
        masterRow({
          rowNumber: 3,
          mvTrackNumber: "MV-CURRENT",
          vehicle: "MTR-CURRENT",
          deploymentDate: "2026-07-01T00:00:00.000Z",
          returnDate: "2026-07-31T00:00:00.000Z",
          paidStatus: "Open",
        }),
      ],
      [inventoryRow({ mvTrackNumber: "MV-CURRENT", motorNumber: "MTR-CURRENT", model: "Upgrade Model" })],
      synchronizedAt
    );

    expect(assignment).toMatchObject({
      currentMvTrackNo: "MV-CURRENT",
      vehicleNumber: "MTR-CURRENT",
      model: "Upgrade Model",
      startedAt: "2026-07-01T00:00:00.000Z",
      accountStatus: "CLOSED",
      deploymentStatus: "COMPLETED",
    });
  });

  it("treats an exchange as the current assignment when it is the latest Plan Start", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, mvTrackNumber: "MV-OLD", deploymentDate: "2026-03-01T00:00:00.000Z" }),
        masterRow({ rowNumber: 3, mvTrackNumber: "MV-EXCHANGE", vehicle: "MTR-EXCHANGE", deploymentDate: "2026-06-15T00:00:00.000Z" }),
      ],
      [inventoryRow({ mvTrackNumber: "MV-EXCHANGE", motorNumber: "MTR-EXCHANGE" })],
      synchronizedAt
    );

    expect(assignment).toMatchObject({
      currentMvTrackNo: "MV-EXCHANGE",
      vehicleNumber: "MTR-EXCHANGE",
      startedAt: "2026-06-15T00:00:00.000Z",
    });
  });

  it("treats an upgrade as the current assignment and keeps account status independently active", () => {
    const [assignment] = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({ rowNumber: 2, mvTrackNumber: "MV-OLD", deploymentDate: "2026-03-01T00:00:00.000Z", paidStatus: "Closed a/c" }),
        masterRow({
          rowNumber: 3,
          mvTrackNumber: "MV-UPGRADE",
          vehicle: "MTR-UPGRADE",
          deploymentDate: "2026-07-01T00:00:00.000Z",
          returnDate: "2026-08-01T00:00:00.000Z",
          paidStatus: "Open",
        }),
      ],
      [inventoryRow({ mvTrackNumber: "MV-UPGRADE", motorNumber: "MTR-UPGRADE" })],
      synchronizedAt
    );

    expect(assignment).toMatchObject({
      currentMvTrackNo: "MV-UPGRADE",
      vehicleNumber: "MTR-UPGRADE",
      accountStatus: "ACTIVE",
      deploymentStatus: "ACTIVE",
    });
  });

  it("returns only the latest rider when two phones resolve to the same MotorNo", () => {
    const assignments = riderAssignmentService.buildCurrentAssignments(
      [
        masterRow({
          rowNumber: 2,
          rider: "Older Rider",
          phone: "9876543210",
          deploymentDate: "2026-03-01T00:00:00.000Z",
          paidStatus: "Open",
        }),
        masterRow({
          rowNumber: 3,
          rider: "Current Rider",
          phone: "9876543211",
          deploymentDate: "2026-07-01T00:00:00.000Z",
          paidStatus: "Closed a/c",
        }),
      ],
      [inventoryRow()],
      synchronizedAt
    );

    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      riderName: "Current Rider",
      riderPhone: "9876543211",
      motorNo: "MTR-1",
      accountStatus: "CLOSED",
      deploymentStatus: "COMPLETED",
    });
  });
});
