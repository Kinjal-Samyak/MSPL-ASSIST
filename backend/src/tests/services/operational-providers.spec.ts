import { OperationalProviders, createOperationalProviders } from "../../services/operational-providers";

describe("OperationalProviders registry", () => {
  it("should_expose_inventory_deployment_and_lookup_providers", () => {
    expect(OperationalProviders.inventoryProvider).toBeDefined();
    expect(OperationalProviders.deploymentProvider).toBeDefined();
    expect(OperationalProviders.lookupProvider).toBeDefined();
  });

  it("should_allow_dependency_injection_overrides", () => {
    const custom = {
      inventoryProvider: {} as any,
      deploymentProvider: {} as any,
      lookupProvider: {} as any,
    };

    const registry = createOperationalProviders(custom);
    expect(registry.inventoryProvider).toBe(custom.inventoryProvider);
    expect(registry.deploymentProvider).toBe(custom.deploymentProvider);
    expect(registry.lookupProvider).toBe(custom.lookupProvider);
  });
});

