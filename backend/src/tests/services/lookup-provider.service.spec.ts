import { LookupProviderService } from "../../services/lookup-provider.service";
import { InMemoryTtlCache } from "../../services/provider-cache";

describe("LookupProviderService", () => {
  it("should_return_standardized_hubs", async () => {
    const repository = {
      getHubs: jest.fn().mockResolvedValue([
        { id: "hub-1", name: "Kolkata Hub", city: "Kolkata", state: "WB" },
      ]),
      getVehicleModels: jest.fn(),
      getPlans: jest.fn(),
      getIssueCategories: jest.fn(),
      getTechnicians: jest.fn(),
      getWorkshopStatuses: jest.fn(),
      getVehicleStatuses: jest.fn(),
    } as any;

    const service = new LookupProviderService(repository, new InMemoryTtlCache());
    const hubs = await service.getHubs();

    expect(hubs).toEqual([
      {
        hubId: "hub-1",
        hubName: "Kolkata Hub",
        city: "Kolkata",
        state: "WB",
      },
    ]);
  });

  it("should_cache_read_only_lookup_data_for_ttl_window", async () => {
    const repository = {
      getHubs: jest.fn().mockResolvedValue([
        { id: "hub-1", name: "Kolkata Hub", city: "Kolkata", state: "WB" },
      ]),
      getVehicleModels: jest.fn(),
      getPlans: jest.fn(),
      getIssueCategories: jest.fn(),
      getTechnicians: jest.fn(),
      getWorkshopStatuses: jest.fn(),
      getVehicleStatuses: jest.fn(),
    } as any;

    const service = new LookupProviderService(repository, new InMemoryTtlCache());
    await service.getHubs();
    await service.getHubs();

    expect(repository.getHubs).toHaveBeenCalledTimes(1);
  });

  it("should_not_cache_technician_lookup", async () => {
    const repository = {
      getHubs: jest.fn(),
      getVehicleModels: jest.fn(),
      getPlans: jest.fn(),
      getIssueCategories: jest.fn(),
      getTechnicians: jest.fn().mockResolvedValue([
        {
          id: "tech-1",
          name: "Tech One",
          mobile: "9999999999",
          tickets: [],
        },
      ]),
      getWorkshopStatuses: jest.fn(),
      getVehicleStatuses: jest.fn(),
    } as any;

    const service = new LookupProviderService(repository, new InMemoryTtlCache());
    await service.getTechnicians({});
    await service.getTechnicians({});

    expect(repository.getTechnicians).toHaveBeenCalledTimes(2);
  });

  it("should_return_model_codes_from_vehicle_models", async () => {
    const repository = {
      getHubs: jest.fn(),
      getVehicleModels: jest.fn().mockResolvedValue([
        {
          id: "model-1",
          modelCode: "M-1",
          displayName: "Model One",
          manufacturer: "OEM",
        },
      ]),
      getPlans: jest.fn(),
      getIssueCategories: jest.fn(),
      getTechnicians: jest.fn(),
      getWorkshopStatuses: jest.fn(),
      getVehicleStatuses: jest.fn(),
    } as any;

    const service = new LookupProviderService(repository, new InMemoryTtlCache());
    const modelCodes = await service.getModelCodes();

    expect(modelCodes).toEqual([
      {
        modelCode: "M-1",
        modelName: "Model One",
      },
    ]);
  });
});

