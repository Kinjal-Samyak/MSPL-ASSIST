# Operational Data Providers Foundation (v1.1)

## Purpose

Operational data access is centralized in a provider layer so business modules never depend on datasource implementation details.

This provider layer is the shared operational access contract for:

- Ticket Module
- Customer Module
- Vehicle Module
- Workshop Module
- Deployment Module
- Reports Module

## Architecture

```
Business Modules
  -> OperationalProviders Registry
    -> InventoryProvider / DeploymentProvider / LookupProvider
      -> Provider Repositories
        -> OperationalDataSource interface
          -> PrismaOperationalDataSource (today)
          -> SQL/ERP/SAP/API adapter (future)
```

### Read-only Contract

All providers are read-only by design. No write operations are exposed from this layer.

## Provider Registry

Single entry point:

- `backend/src/services/operational-providers.ts`
- exports `OperationalProviders`
- exports `createOperationalProviders(...)` for dependency injection

Future modules should consume providers from this registry instead of constructing providers inside modules.

## Providers

### InventoryProvider

- Find Vehicle
- Find Vehicle By MV Track
- Find Vehicle By VIN
- Return Vehicle Details
- Return Vehicle Status
- Return Hub
- Return Model
- Return IoT Details

Business rule:

- Vehicle operational lookup is centered on MV Track Number.

### DeploymentProvider

- Find Rider By Phone
- Find Rider By Name
- Return Active Deployment
- Return Latest Deployment
- Return Deployment History
- Return Assigned Vehicle
- Return Current Hub

Business rules:

- Select latest ACTIVE deployment when multiple exist.
- If no ACTIVE deployment exists, fallback to latest deployment.

### LookupProvider

- Get Hubs
- Get Vehicle Models
- Get Model Codes
- Get Plans
- Get Issue Categories
- Get Issue Sub Categories
- Get Technicians
- Get Workshop Statuses
- Get Vehicle Statuses

Returns standardized lookup DTOs suitable for module-level consumption.

## Caching Strategy

Lightweight in-memory TTL cache is used only for read-only master lookups:

- Hubs
- Vehicle Models
- Model Codes
- Plans
- Issue Categories
- Issue Sub Categories
- Workshop Statuses
- Vehicle Statuses

Cache TTL: **5 minutes**

Not cached:

- Technician lookup (operational availability can change frequently)
- Deployment history and rider search flows (handled by DeploymentProvider, non-cached)

## Usage Examples

```ts
import { OperationalProviders } from "../services/operational-providers";

const hubs = await OperationalProviders.lookupProvider.getHubs();
const vehicle = await OperationalProviders.inventoryProvider.getVehicleDetails("MV-1234");
const activeDeployment = await OperationalProviders.deploymentProvider.getActiveDeployment("customer-id");
```

For tests/custom wiring:

```ts
import { createOperationalProviders } from "../services/operational-providers";

const providers = createOperationalProviders({
  dataSource: customDataSourceAdapter,
});
```

## ERP/API Replacement Strategy

No business module changes are required when replacing datasource implementation.

Replacement flow:

1. Implement a new `OperationalDataSource` adapter (for ERP/SAP/API).
2. Inject adapter through `createOperationalProviders({ dataSource })`.
3. Keep provider service interfaces and DTO contracts unchanged.

This keeps module business logic stable while datasource integrations evolve.
