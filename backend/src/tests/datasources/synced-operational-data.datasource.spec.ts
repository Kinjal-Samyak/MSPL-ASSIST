import { SyncedOperationalDataSource } from "../../datasources/synced-operational-data.datasource";

describe("SyncedOperationalDataSource inventory identity", () => {
  it("falls back to persisted deployment inventory when no synchronized inventory snapshot exists", async () => {
    const fallbackRows = [{
      sourceId: "deployment-1", mvTrackNumber: "MVTEST003", vehicleNumber: "MVTEST003",
      registrationNumber: null, vin: null, chassisNumber: null, motorNumber: null, batteryNumber: "MVTEST003",
      modelCode: "HUM", modelName: "HUM", color: null, variant: null, manufacturer: null,
      hubId: "hub-1", hubName: "Hub 1", iotImei: null, iotSimNumber: null, ownership: null,
      purchaseDate: null, assetCost: null, warrantyExpiryDate: null, registrationExpiryDate: null,
      insuranceExpiryDate: null, fitnessExpiryDate: null, pucExpiryDate: null, fdd: null,
      currentCustomerId: "customer-1", currentCustomerName: "Rahul Das", currentCustomerPhone: "9123456780",
      rentalStatus: "ACTIVE", createdAt: "2026-07-18T00:00:00.000Z", updatedAt: "2026-07-18T00:00:00.000Z",
    }];
    const fallback = { listInventoryRecords: jest.fn().mockResolvedValue(fallbackRows) };
    const prisma = {
      appSetting: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const source = new SyncedOperationalDataSource(prisma, fallback as any, { list: jest.fn().mockResolvedValue([]) } as any);

    await expect(source.listInventoryRecords()).resolves.toEqual(fallbackRows);
    expect(fallback.listInventoryRecords).toHaveBeenCalledTimes(1);
  });

  it("continues to associate a synchronized rider assignment with its inventory record", async () => {
    const master = {
      rowNumber: 2, rider: "Rider One", phone: "9876543210", hub: "Kolkata", vehicle: "MTR001",
      mvTrackNumber: "000123", plan: "Gold", status: "ACTIVE", deploymentDate: "2026-07-13T00:00:00.000Z",
      returnDate: null, coordinator: "Coord A", paidStatus: null, fddStatus: "Plan Start", isLatestForRider: true,
    };
    const inventory = {
      rowNumber: 2, mvTrackNumber: "123", model: "Model A", modelCode: "MA", vehicleStatus: "DEPLOYED",
      hub: "Kolkata", batteryNumber: "BAT-001", iotDevice: "IOT-001", vin: "VIN001", motorNumber: "MTR001", chassisNumber: "CHS001",
    };
    const prisma = {
      appSetting: {
        findMany: jest.fn()
          .mockResolvedValueOnce([{ value: { payload: master } }])
          .mockResolvedValueOnce([{ value: { payload: inventory } }]),
      },
    } as any;
    const source = new SyncedOperationalDataSource(prisma, {} as any, { list: jest.fn().mockResolvedValue([]) } as any);

    const deployments = await source.findDeploymentsByPhone("9876543210");
    const inventoryRows = await source.findInventoryByMvTrack("000123");

    expect(deployments).toHaveLength(1);
    expect(inventoryRows).toHaveLength(1);
    expect(inventoryRows[0]).toMatchObject({ currentCustomerName: "Rider One", motorNumber: "MTR001" });
  });

  it("exposes exactly one physical vehicle for duplicate MotorNo snapshots", async () => {
    const inventory = (mvTrackNumber: string, motorNumber: string, rowNumber: number) => ({
      rowNumber,
      mvTrackNumber,
      model: "Model A",
      modelCode: "MA",
      vehicleStatus: "ACTIVE",
      hub: "Kolkata",
      batteryNumber: null,
      iotDevice: null,
      vin: null,
      motorNumber,
      chassisNumber: null,
    });
    const prisma = {
      datasetSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          { snapshotKey: "inventory-nspl:legacy-mv", payload: { rowKey: "MV-OLD", checksum: "a", payload: inventory("MV-OLD", "M-001", 2) } },
          { snapshotKey: "inventory-nspl:motor", payload: { rowKey: "M001", checksum: "b", payload: inventory("MV-NEW", "M001", 3) } },
        ]),
      },
      appSetting: { findMany: jest.fn() },
    } as any;
    const source = new SyncedOperationalDataSource(prisma);

    const rows = await source.listInventoryRecords();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mvTrackNumber: "MV-NEW", motorNumber: "M001" });
  });

  it("marks every inventory MotorNo present in master as deployed regardless of rider account closure", async () => {
    const master = {
      rowNumber: 2, rider: "Rider One", phone: "9876543210", hub: "Kolkata", vehicle: "MTR-001",
      mvTrackNumber: "MV-001", plan: "", status: "", deploymentDate: "2026-07-13T00:00:00.000Z",
      returnDate: "2026-07-20T00:00:00.000Z", coordinator: "", paidStatus: "Closed a/c",
      fddStatus: null, isLatestForRider: false,
    };
    const inventory = (motorNumber: string, mvTrackNumber: string) => ({
      rowNumber: 2, mvTrackNumber, model: "Model A", modelCode: "MA", vehicleStatus: "AVAILABLE",
      hub: "Kolkata", batteryNumber: null, iotDevice: null, vin: null, motorNumber, chassisNumber: null,
    });
    const prisma = {
      appSetting: {
        findMany: jest.fn()
          .mockResolvedValueOnce([{ value: { payload: master } }])
          .mockResolvedValueOnce([
            { value: { payload: inventory("MTR001", "MV-001") } },
            { value: { payload: inventory("MTR002", "MV-002") } },
          ]),
      },
    } as any;
    const source = new SyncedOperationalDataSource(prisma, {} as any, { list: jest.fn().mockResolvedValue([]) } as any);

    const rows = await source.listInventoryRecords();

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ motorNumber: "MTR001", rentalStatus: "ACTIVE" }),
      expect.objectContaining({ motorNumber: "MTR002", rentalStatus: "COMPLETED" }),
    ]));
  });
});
