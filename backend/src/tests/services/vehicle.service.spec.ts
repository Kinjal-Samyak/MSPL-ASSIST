import { UnprocessableEntityError } from "../../errors";
import { VehicleService } from "../../services/vehicle.service";

function makeVehicle(overrides: Partial<any> = {}) {
  return {
    mvTrackNumber: "MV-001",
    vehicleNumber: "WB12AB1234",
    registrationNumber: "WB12AB1234",
    vin: "VIN-001",
    chassisNumber: null,
    motorNumber: null,
    batteryNumber: "BAT-001",
    modelCode: "M-1",
    modelName: "Model One",
    color: null,
    variant: null,
    manufacturer: "OEM",
    hub: { hubId: "hub-1", hubName: "Kolkata" },
    status: "DEPLOYED",
    ownership: null,
    purchaseDate: null,
    assetCost: null,
    warrantyExpiryDate: null,
    registrationExpiryDate: null,
    insuranceExpiryDate: "2027-07-10T00:00:00.000Z",
    fitnessExpiryDate: null,
    pucExpiryDate: null,
    fdd: "PDI completed",
    currentCustomerId: "cust-1",
    currentCustomerName: "Rider One",
    currentCustomerPhone: "9876543210",
    iot: { imei: null, simNumber: null },
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("VehicleService", () => {
  it("should_return_vehicle_dashboard", async () => {
    const providers = {
      inventoryProvider: {
        listVehicles: jest.fn().mockResolvedValue([makeVehicle({ status: "DEPLOYED" }), makeVehicle({ mvTrackNumber: "MV-002", status: "AVAILABLE" })]),
      },
      deploymentProvider: {},
      lookupProvider: {},
    } as any;
    const repository = {} as any;

    const service = new VehicleService(providers, repository);
    const dashboard = await service.getDashboard({ status: "AVAILABLE" });

    expect(dashboard.totalVehicles).toBe(2);
    expect(dashboard.deployedVehicles).toBe(1);
    expect(dashboard.availableVehicles).toBe(1);
    expect(providers.inventoryProvider.listVehicles).toHaveBeenCalledTimes(1);
  });

  it("should_return_vehicle_list", async () => {
    const providers = {
      inventoryProvider: {
        listVehicles: jest.fn().mockResolvedValue([makeVehicle()]),
      },
      deploymentProvider: {},
      lookupProvider: {},
    } as any;
    const service = new VehicleService(providers, {} as any);
    const result = await service.getVehicles({ page: 1, pageSize: 10 });

    expect(result.totalRecords).toBe(1);
    expect(result.items[0].vehicleId).toBe("MV-001");
  });

  it("should_prioritize_down_over_deployed_and_keep_fleet_states_exclusive", async () => {
    const providers = {
      inventoryProvider: {
        listVehicles: jest.fn().mockResolvedValue([
          makeVehicle({ mvTrackNumber: "MV-001" }),
          makeVehicle({ mvTrackNumber: "MV-002" }),
          makeVehicle({ mvTrackNumber: "MV-003" }),
        ]),
      },
      deploymentProvider: {},
      lookupProvider: {},
    } as any;
    const repository = {
      getFleetOperationalSignals: jest.fn().mockResolvedValue({
        activeDeploymentMvTracks: new Set(["MV-001", "MV-002"]),
        downMvTracks: new Set(["MV-001"]),
        openDowntimeStartedAtByMvTrack: new Map([["MV-001", new Date(Date.now() - 73 * 60 * 60 * 1000)]]),
        completedDowntimeHours: [12, 24],
        currentMonthDowntimeHours: 48,
        previouslyDeployedMvTracks: new Set(["MV-001", "MV-002"]),
        downFleetBreakdown: {
          inspection: new Set(),
          waitingForSpare: new Set(["MV-001"]),
          workInProgress: new Set(),
          readyForDeployment: new Set(),
        },
        waitingForSpare: 1,
        repairInProgress: 0,
        qualityCheck: 0,
      }),
    } as any;
    const service = new VehicleService(providers, repository);

    const dashboard = await service.getDashboard({});
    const list = await service.getVehicles({ page: 1, pageSize: 10 });

    expect(dashboard).toMatchObject({
      totalVehicles: 3,
      downFleet: 1,
      revenueFleet: 1,
      readyForDeployment: 1,
      fleetUtilizationPercent: 33.3,
      vehiclesAgingOver72Hours: 1,
    });
    expect(new Map(list.items.map((item) => [item.mvTrackNumber, item.status]))).toEqual(
      new Map([["MV-001", "WORKSHOP"], ["MV-002", "DEPLOYED"], ["MV-003", "AVAILABLE"]])
    );
  });

  it("should_place undeployed vehicles with incomplete compliance in inventory hold", async () => {
    const providers = {
      inventoryProvider: {
        listVehicles: jest.fn().mockResolvedValue([
          makeVehicle({ mvTrackNumber: "MV-HOLD", registrationNumber: null }),
        ]),
      },
      deploymentProvider: {},
      lookupProvider: {},
    } as any;
    const repository = {
      getFleetOperationalSignals: jest.fn().mockResolvedValue({
        activeDeploymentMvTracks: new Set(), downMvTracks: new Set(), openDowntimeStartedAtByMvTrack: new Map(),
        completedDowntimeHours: [], currentMonthDowntimeHours: 0, previouslyDeployedMvTracks: new Set(),
        downFleetBreakdown: { inspection: new Set(), waitingForSpare: new Set(), workInProgress: new Set(), readyForDeployment: new Set() },
        waitingForSpare: 0, repairInProgress: 0, qualityCheck: 0,
      }),
    } as any;
    const service = new VehicleService(providers, repository);

    const dashboard = await service.getDashboard({});
    const list = await service.getVehicles({ page: 1, pageSize: 10 });

    expect(dashboard).toMatchObject({ inventoryHold: 1, readyForDeployment: 0, revenueFleet: 0, downFleet: 0 });
    expect(dashboard.inventoryHoldBreakdown.registrationPending).toBe(1);
    expect(list.items[0].status).toBe("INACTIVE");
  });

  it("should_throw_when_vehicle_not_found", async () => {
    const providers = {
      inventoryProvider: {
        getVehicleDetails: jest.fn().mockResolvedValue(null),
      },
      deploymentProvider: {},
      lookupProvider: {},
    } as any;
    const service = new VehicleService(providers, {} as any);

    await expect(service.getVehicleById("MV-404")).rejects.toThrow(UnprocessableEntityError);
  });

  it("should_block_deactivate_when_active_deployment_exists", async () => {
    const providers = {
      inventoryProvider: {
        getVehicleDetails: jest.fn().mockResolvedValue(makeVehicle()),
      },
      deploymentProvider: {
        getCurrentDeploymentByVehicle: jest.fn().mockResolvedValue({
          deploymentId: "dep-1",
          customerId: "cust-1",
          vehicleNumber: "WB12AB1234",
          mvTrackNumber: "MV-001",
          rentalStatus: "ACTIVE",
          hubId: "hub-1",
          hubName: "Kolkata",
          modelName: "Model One",
          startedAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
        }),
      },
      lookupProvider: {},
    } as any;

    const service = new VehicleService(providers, {} as any);
    await expect(service.deactivateVehicle("MV-001")).rejects.toThrow(UnprocessableEntityError);
  });
});

