import { ExcelSyncRepository } from "../../excel/excel-sync.repository";
import { createHash } from "node:crypto";

describe("ExcelSyncRepository", () => {
  it("should_insert_when_snapshot_does_not_exist", async () => {
    const prisma = {
      appSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    } as any;

    const repository = new ExcelSyncRepository(prisma);
    const action = await repository.upsertInventoryNsplRow({
      rowNumber: 1,
      mvTrackNumber: "MV-001",
      model: "Model A",
      modelCode: "MA",
      vehicleStatus: "ACTIVE",
      hub: "Kolkata",
      batteryNumber: null,
      iotDevice: null,
      vin: null,
      motorNumber: "M-001",
      chassisNumber: null,
    });

    expect(action).toBe("inserted");
    expect(prisma.appSetting.create).toHaveBeenCalledTimes(1);
    const expectedKey = createHash("sha256").update("M001").digest("hex");
    expect(prisma.appSetting.findUnique).toHaveBeenCalledWith({
      where: { settingKey: `inventory-nspl:${expectedKey}` },
      select: { id: true, value: true },
    });
  });

  it("should_mark_unchanged_when_checksum_matches", async () => {
    const payload = {
      rowNumber: 1,
      mvTrackNumber: "MV-001",
      model: "Model A",
      modelCode: "MA",
      vehicleStatus: "ACTIVE",
      hub: "Kolkata",
      batteryNumber: null,
      iotDevice: null,
      vin: null,
      motorNumber: null,
      chassisNumber: null,
    };
    const checksum = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const existingValue = {
      rowKey: "MV-001",
      checksum,
      payload,
    };
    const prisma = {
      appSetting: {
        findUnique: jest.fn().mockResolvedValue({ id: "app-1", value: existingValue }),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    const repository = new ExcelSyncRepository(prisma);
    const action = await repository.upsertInventoryNsplRow(payload);

    expect(action).toBe("unchanged");
    expect(prisma.appSetting.update).not.toHaveBeenCalled();
  });
});
