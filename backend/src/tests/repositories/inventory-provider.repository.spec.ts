import { InventoryProviderRepository } from "../../repositories/inventory-provider.repository";

describe("InventoryProviderRepository", () => {
  it("should_find_vehicle_by_mv_track", async () => {
    const dataSource = {
      findInventoryByMvTrack: jest.fn().mockResolvedValue([
        {
          sourceId: "dep-1",
          mvTrackNumber: "MV-001",
        },
      ]),
      findInventoryByVin: jest.fn(),
      findInventoryByVehicleNumber: jest.fn(),
      findDeploymentsByCustomerId: jest.fn(),
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
    } as any;

    const repository = new InventoryProviderRepository(dataSource);
    const result = await repository.findVehicleByMvTrack("MV-001");

    expect(dataSource.findInventoryByMvTrack).toHaveBeenCalledWith("MV-001");
    expect(result).toMatchObject({ sourceId: "dep-1", mvTrackNumber: "MV-001" });
  });

  it("should_return_null_when_vehicle_by_vin_missing", async () => {
    const dataSource = {
      findInventoryByMvTrack: jest.fn(),
      findInventoryByVin: jest.fn().mockResolvedValue([]),
      findInventoryByVehicleNumber: jest.fn(),
      findDeploymentsByCustomerId: jest.fn(),
      findDeploymentsByPhone: jest.fn(),
      findDeploymentsByRiderName: jest.fn(),
    } as any;

    const repository = new InventoryProviderRepository(dataSource);
    const result = await repository.findVehicleByVin("VIN-001");

    expect(result).toBeNull();
  });
});

