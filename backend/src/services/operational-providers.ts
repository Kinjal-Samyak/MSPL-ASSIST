import type { OperationalDataSource } from "../datasources/operational-data.datasource";
import { SyncedOperationalDataSource } from "../datasources/synced-operational-data.datasource";
import { prismaClient } from "../database";
import type {
  DeploymentProvider,
  InventoryProvider,
  LookupProvider,
} from "../interfaces/operational-providers.interface";
import { DeploymentProviderRepository } from "../repositories/deployment-provider.repository";
import { InventoryProviderRepository } from "../repositories/inventory-provider.repository";
import { LookupProviderRepository } from "../repositories/lookup-provider.repository";
import { DeploymentProviderService } from "./deployment-provider.service";
import { InventoryProviderService } from "./inventory-provider.service";
import { LookupProviderService } from "./lookup-provider.service";
import { InMemoryTtlCache } from "./provider-cache";

export interface OperationalProvidersRegistry {
  inventoryProvider: InventoryProvider;
  deploymentProvider: DeploymentProvider;
  lookupProvider: LookupProvider;
}

export interface OperationalProvidersFactoryOptions {
  dataSource?: OperationalDataSource;
  inventoryProvider?: InventoryProvider;
  deploymentProvider?: DeploymentProvider;
  lookupProvider?: LookupProvider;
}

export function createOperationalProviders(
  options: OperationalProvidersFactoryOptions = {}
): OperationalProvidersRegistry {
  const dataSource = options.dataSource ?? new SyncedOperationalDataSource(prismaClient);
  const inventoryProvider =
    options.inventoryProvider ??
    new InventoryProviderService(new InventoryProviderRepository(dataSource));
  const deploymentProvider =
    options.deploymentProvider ??
    new DeploymentProviderService(new DeploymentProviderRepository(dataSource));
  const lookupProvider =
    options.lookupProvider ??
    new LookupProviderService(new LookupProviderRepository(dataSource), new InMemoryTtlCache());

  return {
    inventoryProvider,
    deploymentProvider,
    lookupProvider,
  };
}

export const OperationalProviders = createOperationalProviders();
