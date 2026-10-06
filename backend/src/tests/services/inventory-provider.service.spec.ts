import { InventoryProviderService } from "../../services/inventory-provider.service";

describe("InventoryProviderService", () => {
  it("should_return_vehicle_details_for_mv_track_lookup", async () => {
    const repository = {
      findVehicleByMvTrack: jest.fn().mockResolvedValue({
        sourceId: "dep-1",
        mvTrackNumber: "MV-001",
        vehicleNumber: "WB12AB1234",
        vin: null,
        chassisNumber: null,
        motorNumber: null,
        batteryNumber: "BAT-001",
        modelCode: "M-1",
        modelName: "Model One",
        variant: null,
        manufacturer: "Maker",
        hubId: "hub-1",
        hubName: "Kolkata",
        iotImei: null,
        iotSimNumber: null,
        ownership: null,
        purchaseDate: null,
        assetCost: null,
        warrantyExpiryDate: null,
        registrationExpiryDate: null,
        insuranceExpiryDate: null,
        fitnessExpiryDate: null,
        pucExpiryDate: null,
        rentalStatus: "ACTIVE",
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
      findVehicleByVin: jest.fn(),
      findVehicleByNumber: jest.fn(),
    } as any;

    const service = new InventoryProviderService(repository);
    const result = await service.getVehicleDetails("MV-001");

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      mvTrackNumber: "MV-001",
      vehicleNumber: "WB12AB1234",
      status: "DEPLOYED",
    });
  });

  it("should_return_vehicle_status", async () => {
    const repository = {
      findVehicleByMvTrack: jest.fn().mockResolvedValue({
        sourceId: "dep-1",
        mvTrackNumber: "MV-001",
        vehicleNumber: "WB12AB1234",
        vin: null,
        chassisNumber: null,
        motorNumber: null,
        batteryNumber: "BAT-001",
        modelCode: "M-1",
        modelName: "Model One",
        variant: null,
        manufacturer: "Maker",
        hubId: "hub-1",
        hubName: "Kolkata",
        iotImei: null,
        iotSimNumber: null,
        ownership: null,
        purchaseDate: null,
        assetCost: null,
        warrantyExpiryDate: null,
        registrationExpiryDate: null,
        insuranceExpiryDate: null,
        fitnessExpiryDate: null,
        pucExpiryDate: null,
        rentalStatus: "COMPLETED",
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
      findVehicleByVin: jest.fn(),
      findVehicleByNumber: jest.fn(),
    } as any;

    const service = new InventoryProviderService(repository);
    const result = await service.getVehicleStatus("MV-001");

    expect(result).toEqual({
      mvTrackNumber: "MV-001",
      vehicleNumber: "WB12AB1234",
      status: "AVAILABLE",
      updatedAt: "2026-07-10T00:00:00.000Z",
    });
  });
});

